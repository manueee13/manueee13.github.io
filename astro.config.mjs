// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  vite: {
    assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
    server: {
      fs: {
        allow: ['..']
      }
    }
  }
  site: 'https://manueee13.github.io',
  base: '/',
  output: 'static',
  build: {
    assets: 'assets'
  }
});