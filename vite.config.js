import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolveKitVersion } from './scripts/kit-version.js';

export default defineConfig({
  define: {
    'import.meta.env.KIT_VERSION': JSON.stringify(resolveKitVersion(new URL('./', import.meta.url)))
  },
  plugins: [
    sveltekit({
      adapter: adapter()
    })
  ]
});
