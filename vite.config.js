import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Lecture en arrière-plan (optionnel) : si le plugin @jofr/capacitor-media-session est installé,
// il est automatiquement inclus dans le build. Sinon le module virtuel est vide.
const mediaPkg = fileURLToPath(new URL('./node_modules/@jofr/capacitor-media-session/package.json', import.meta.url));
const hasNativeMedia = existsSync(mediaPkg);

const nativeMedia = {
  name: 'native-media',
  resolveId(id) {
    if (id === 'virtual:native-media') return '\0virtual:native-media';
  },
  load(id) {
    if (id === '\0virtual:native-media') {
      return hasNativeMedia ? "import '@jofr/capacitor-media-session';" : 'export {};';
    }
  },
};

export default defineConfig({
  base: './',
  plugins: [nativeMedia],
  build: { outDir: 'dist', target: 'es2020', chunkSizeWarningLimit: 900 },
  server: { port: 5173 },
});
