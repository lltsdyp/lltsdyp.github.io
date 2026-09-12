import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://lltsdyp.github.io',
  trailingSlash: 'ignore',
  image: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
  integrations: [mdx(), sitemap()],
});
