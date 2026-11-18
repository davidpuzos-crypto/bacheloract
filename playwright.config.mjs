// Configuration des tests automatiques (Playwright).
// Lancer : npm test   (le serveur local démarre tout seul sur le port 4173)
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/fabrique/',
    trace: 'off',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    viewport: { width: 1440, height: 900 }
  },
  webServer: {
    command: 'node scripts/serve.mjs 4173',
    url: 'http://localhost:4173/fabrique/',
    reuseExistingServer: true,
    timeout: 20000
  }
});
