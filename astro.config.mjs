import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://codingplanguide.com',
  baseURL: '/',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto'
  }
});