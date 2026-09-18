import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const claudeChatTheme = {
  name: 'claude-chat',
  type: 'light',
  colors: {
    'editor.background': '#efeeea',
    'editor.foreground': '#3d3935',
    'editor.lineHighlightBackground': '#eceae6',
    'editor.selectionBackground': '#e4dfd9',
    'editorCursor.foreground': '#b4775f',
    'editorWhitespace.foreground': '#d8d3cc',
  },
  settings: [
    { settings: { background: '#efeeea', foreground: '#3d3935' } },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#938a84', fontStyle: 'italic' },
    },
    {
      scope: ['keyword', 'storage', 'storage.type', 'storage.modifier'],
      settings: { foreground: '#a26955' },
    },
    {
      scope: ['string', 'string.quoted'],
      settings: { foreground: '#8b7656' },
    },
    {
      scope: ['constant.numeric', 'constant.language', 'support.constant'],
      settings: { foreground: '#9b7955' },
    },
    {
      scope: ['entity.name.function', 'support.function', 'meta.function-call'],
      settings: { foreground: '#866354' },
    },
    {
      scope: ['entity.name.type', 'support.type', 'storage.type.class'],
      settings: { foreground: '#8c7560' },
    },
    {
      scope: ['variable', 'variable.other', 'meta.definition.variable'],
      settings: { foreground: '#3d3935' },
    },
    {
      scope: ['punctuation', 'meta.brace', 'keyword.operator'],
      settings: { foreground: '#716b66' },
    },
  ],
};

export default defineConfig({
  site: 'https://lltsdyp.github.io',
  trailingSlash: 'ignore',
  redirects: {
    '/studio': '/about',
  },
  image: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
  markdown: {
    shikiConfig: {
      theme: claudeChatTheme,
    },
  },
  integrations: [mdx(), sitemap()],
});
