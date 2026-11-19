// Chiffrement des réponses envoyées à l’enseignant, et signature de l’heure
// de départ qu’il diffuse. Module utilisé par les pages (navigateur) et par
// les scripts Node (création des clés, serveur de test).
//
// Réponses : chiffrement hybride pour la clé publique de l’enseignant
// (ECDH P-256 avec une clé éphémère, HKDF-SHA-256, AES-GCM 256). Le relais
// ne voit passer que des données chiffrées.
// Heure diffusée : signée par l’enseignant (ECDSA P-256), vérifiée par les
// pages des étudiant·es, qui ignorent toute heure non signée.
// Coffre : les deux clés privées de l’enseignant, chiffrées avec une clé tirée
// de son code (PBKDF2-SHA-256). Le coffre est public (data/config.json), le
// code ne l’est jamais.

const S = globalThis.crypto.subtle;
const ENC = new TextEncoder();
const DEC = new TextDecoder();
const ECDH = { name: 'ECDH', namedCurve: 'P-256' };
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGNATURE = { name: 'ECDSA', hash: 'SHA-256' };
const SEL_HKDF = ENC.encode('fabrique-s09');
const INFO_HKDF = ENC.encode('fabrique-s09 reponses v1');
const ALPHABET_CODE = 'abcdefghjkmnpqrstuvwxyz23456789';

// ---------------------------------------------------------------- encodage

export function enB64(octets) {
  const o = octets instanceof Uint8Array ? octets : new Uint8Array(octets);
  let s = '';
  for (let i = 0; i < o.length; i += 0x8000) { s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000)); }
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function deB64(texte) {
  const s = String(texte || '').replace(/-/g, '+').replace(/_/g, '/');
  const b = atob(s + '==='.slice((s.length + 3) % 4));
  const o = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) { o[i] = b.charCodeAt(i); }
  return o;
}

function concat(...parties) {
  const total = parties.reduce((n, p) => n + p.length, 0);
  const o = new Uint8Array(total);
  let i = 0;
  parties.forEach((p) => { o.set(p, i); i += p.length; });
  return o;
}

// ---------------------------------------------------------------- compression

async function traverser(octets, Flux) {
  const flux = new Blob([octets]).stream().pipeThrough(new Flux('deflate'));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

async function compresser(octets) {
  if (typeof CompressionStream === 'undefined') { return concat([0], octets); }
  try { return concat([1], await traverser(octets, CompressionStream)); } catch (e) { return concat([0], octets); }
}

async function decompresser(octets) {
  if (octets[0] === 0) { return octets.subarray(1); }
  if (octets[0] === 1) { return traverser(octets.subarray(1), DecompressionStream); }
  throw new Error('format');
}

// ---------------------------------------------------------------- réponses

async function cleCommune(privee, publique, usages) {
  const secret = await S.deriveBits({ name: 'ECDH', public: publique }, privee, 256);
  const base = await S.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  return S.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: SEL_HKDF, info: INFO_HKDF }, base,
    { name: 'AES-GCM', length: 256 }, false, usages);
}

// Chiffre un objet pour l’enseignant. Résultat : texte base64url.
export async function chiffrerPour(clePubliqueB64, objet) {
  const destinataire = await S.importKey('raw', deB64(clePubliqueB64), ECDH, false, []);
  const ephemere = await S.generateKey(ECDH, true, ['deriveBits']);
  const cle = await cleCommune(ephemere.privateKey, destinataire, ['encrypt']);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const clair = await compresser(ENC.encode(JSON.stringify(objet)));
  const chiffre = new Uint8Array(await S.encrypt({ name: 'AES-GCM', iv }, cle, clair));
  const epk = new Uint8Array(await S.exportKey('raw', ephemere.publicKey));
  return enB64(concat([1], epk, iv, chiffre));
}

// Déchiffre un texte produit par chiffrerPour, avec la clé privée de
// l’enseignant. Lève une erreur si le texte est altéré ou n’est pas pour lui.
export async function dechiffrer(clePrivee, texte) {
  const o = deB64(texte);
  if (o[0] !== 1 || o.length < 1 + 65 + 12 + 16) { throw new Error('format'); }
  const epk = await S.importKey('raw', o.subarray(1, 66), ECDH, false, []);
  const cle = await cleCommune(clePrivee, epk, ['decrypt']);
  const clair = new Uint8Array(await S.decrypt({ name: 'AES-GCM', iv: o.subarray(66, 78) }, cle, o.subarray(78)));
  return JSON.parse(DEC.decode(await decompresser(clair)));
}

// ---------------------------------------------------------------- heure diffusée

export async function signer(clePrivee, objet) {
  const donnees = enB64(ENC.encode(JSON.stringify(objet)));
  const sig = await S.sign(SIGNATURE, clePrivee, ENC.encode(donnees));
  return donnees + '.' + enB64(new Uint8Array(sig));
}

// Renvoie l’objet signé, ou null si la signature n’est pas celle de l’enseignant.
export async function verifier(clePubliqueB64, texte) {
  try {
    const [donnees, sig] = String(texte || '').split('.');
    if (!donnees || !sig) { return null; }
    const cle = await S.importKey('raw', deB64(clePubliqueB64), ECDSA, false, ['verify']);
    const ok = await S.verify(SIGNATURE, cle, deB64(sig), ENC.encode(donnees));
    return ok ? JSON.parse(DEC.decode(deB64(donnees))) : null;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------- coffre de l’enseignant

// Majuscules, espaces et tirets sont ignorés : « K7PQ 3MZT » vaut « k7pq-3mzt ».
export function normaliserCode(code) {
  return String(code || '').normalize('NFC').toLowerCase().replace(/[\s\-_.]+/g, '');
}

async function cleDuCode(code, sel, iterations, usages) {
  const base = await S.importKey('raw', ENC.encode(normaliserCode(code)), 'PBKDF2', false, ['deriveKey']);
  return S.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations }, base,
    { name: 'AES-GCM', length: 256 }, false, usages);
}

// Ouvre le coffre avec le code. Renvoie les clés privées, ou null si le code
// est faux.
export async function ouvrirCoffre(coffre, code) {
  if (!coffre || !coffre.donnees || !normaliserCode(code)) { return null; }
  let clair;
  try {
    const cle = await cleDuCode(code, deB64(coffre.sel), Number(coffre.iterations) || 600000, ['decrypt']);
    clair = await S.decrypt({ name: 'AES-GCM', iv: deB64(coffre.iv) }, cle, deB64(coffre.donnees));
  } catch (e) {
    return null;
  }
  const d = JSON.parse(DEC.decode(clair));
  return {
    dechiffrement: await S.importKey('pkcs8', deB64(d.ecdh), ECDH, false, ['deriveBits']),
    signature: await S.importKey('pkcs8', deB64(d.ecdsa), ECDSA, false, ['sign'])
  };
}

// Change le code qui ouvre le coffre, sans changer les clés : les réponses
// déjà envoyées restent lisibles. Renvoie le nouveau coffre, ou null si
// l’ancien code est faux.
export async function changerCodeCoffre(coffre, ancienCode, nouveau, iterations = 600000) {
  let clair;
  try {
    const ancienne = await cleDuCode(ancienCode, deB64(coffre.sel), Number(coffre.iterations) || 600000, ['decrypt']);
    clair = await S.decrypt({ name: 'AES-GCM', iv: deB64(coffre.iv) }, ancienne, deB64(coffre.donnees));
  } catch (e) {
    return null;
  }
  const sel = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const cle = await cleDuCode(nouveau, sel, iterations, ['encrypt']);
  const donnees = new Uint8Array(await S.encrypt({ name: 'AES-GCM', iv }, cle, new Uint8Array(clair)));
  return { sel: enB64(sel), iv: enB64(iv), iterations, donnees: enB64(donnees) };
}

// Code aléatoire lisible, en quatre groupes de quatre caractères (environ
// 79 bits), sans caractères faciles à confondre (0 et o, 1 et l).
export function nouveauCode() {
  const n = ALPHABET_CODE.length;
  const limite = 256 - (256 % n);
  let c = '';
  while (c.length < 16) {
    for (const x of globalThis.crypto.getRandomValues(new Uint8Array(32))) {
      if (x < limite && c.length < 16) { c += ALPHABET_CODE[x % n]; }
    }
  }
  return c.match(/.{4}/g).join('-');
}

// Crée les clés de l’enseignant et le coffre qui protège ses clés privées.
export async function creerCles(code, iterations = 600000) {
  const ecdh = await S.generateKey(ECDH, true, ['deriveBits']);
  const ecdsa = await S.generateKey(ECDSA, true, ['sign', 'verify']);
  const privees = {
    ecdh: enB64(await S.exportKey('pkcs8', ecdh.privateKey)),
    ecdsa: enB64(await S.exportKey('pkcs8', ecdsa.privateKey))
  };
  const sel = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const cle = await cleDuCode(code, sel, iterations, ['encrypt']);
  const donnees = new Uint8Array(await S.encrypt({ name: 'AES-GCM', iv }, cle, ENC.encode(JSON.stringify(privees))));
  return {
    clePublique: enB64(await S.exportKey('raw', ecdh.publicKey)),
    cleSignature: enB64(await S.exportKey('raw', ecdsa.publicKey)),
    coffre: { sel: enB64(sel), iv: enB64(iv), iterations, donnees: enB64(donnees) }
  };
}
