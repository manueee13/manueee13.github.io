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
  },
  site: 'https://manueee13.github.io',
  base: '/manueee13.github.io/',
  output: 'static',
  build: {
    assets: 'assets'
  }
});