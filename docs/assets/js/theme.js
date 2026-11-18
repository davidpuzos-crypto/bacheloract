// Chargé de façon synchrone dans <head> : applique le thème, le mode sobre et
// le drapeau d’aide avant l’affichage, pour éviter un flash de couleurs.
(function () {
  try {
    var s = JSON.parse(window.localStorage.getItem('fabrique:s09:v1') || '{}');
    var o = s.options || {};
    var r = document.documentElement;
    if (o.theme === 'light' || o.theme === 'dark') { r.setAttribute('data-theme', o.theme); }
    if (o.sobre) { r.setAttribute('data-sobre', '1'); }
    if (s.drapeau === 'aide') { r.setAttribute('data-drapeau', 'aide'); }
  } catch (e) { /* stockage indisponible : thème automatique */ }
})();
