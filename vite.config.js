import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

/** @returns {string} */
function readLatestChangelogVersion() {
  try {
    const content = readFileSync(new URL('./CHANGELOG.md', import.meta.url), 'utf8');
    const match = content.match(/^## (v[0-9]+\.[0-9]+\.[0-9]+)/m);

    return match ? match[1] : '';
  } catch {
    return '';
  }
}

export default defineConfig({
  define: {
    'import.meta.env.KIT_VERSION': JSON.stringify(readLatestChangelogVersion())
  },
  plugins: [
    sveltekit({
      adapter: adapter()
    })
  ]
});
