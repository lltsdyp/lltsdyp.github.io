# Self Esteem (Astro Template)

![Magazine cover homepage](public/hero.jpeg)

[![Live preview](https://img.shields.io/badge/▶_Live_preview-121418?style=for-the-badge&labelColor=121418&color=e9e6e4)](https://miro.build/templates/self-esteem)

A magazine-style editorial template built with [Astro](https://astro.build). Original layout by [Aysenur Turk](https://codepen.io/TurkAysenur/pen/gOmMgpx), re-implemented here as a full project.

## Quick start

Scaffold a new project from this template:

```bash
# npm
npm create astro@latest -- --template m-durana/self-esteem-astro

# pnpm
pnpm create astro@latest --template m-durana/self-esteem-astro

# yarn
yarn create astro --template m-durana/self-esteem-astro

# bun
bun create astro@latest --template m-durana/self-esteem-astro
```

Or use the "Use template" button in the top right or clone directly:

```bash
git clone https://github.com/m-durana/self-esteem-astro.git
cd self-esteem-astro
npm install
```

Then:

```bash
npm run dev      # http://localhost:4321
npm run build    # static output to ./dist
```

## Features

- Full-viewport magazine homepage (`/`)
- `/blog` index + `/blog/[slug]` MDX post pages with prev/next
- `/tags/[tag]` pages generated from post frontmatter
- `/about`, `/contact`, `/work` (data-driven), `/404`
- RSS at `/rss.xml`, OG/Twitter meta in `BaseLayout`
- `PageLayout` + `_template.astro.example` for creating new pages

## Structure

```
src/
├── components/      Menu, Footer, GalleryItem, Sidebar, Marquee, Circle, StickyHeader
├── content/         posts/ (md+mdx), gallery/, work/
├── content.config.ts
├── layouts/         BaseLayout, PageLayout
├── pages/           index, blog/, tags/, about, contact, work, 404, rss.xml
└── styles/global.scss
```

See [STYLEGUIDE.md](STYLEGUIDE.md) for tokens, type scale, and a guide for staying on-brand.

## Authoring a post

Drop a `.md` or `.mdx` file in `src/content/posts/`:

```md
---
title: 'Your Article Title'
bigTitle: 'Hero'
emphasis: 'Word' # optional, italicised inside the headline
headline: 'Sharing The {emphasis} Acclaim About Motivation'
excerpt: 'Teaser shown in /blog.'
author: 'Jane Doe'
date: 2026-01-01
cover: 'https://images.unsplash.com/...'
tags: ['attention', 'quiet']
pageNumber: 'NO. 01' # optional, article eyebrow
---

Long-form body.
```

Portfolio items (`src/content/work/`) use a smaller schema; see `content.config.ts`.

## Homepage gallery

Homepage images and captions live in `src/content/gallery/`, independently of Blog.
The existing exhibits were moved here from `posts/`; their Markdown bodies are
preserved as source material, but only frontmatter is displayed on the homepage.
Gallery entries do not create Blog pages, tags, RSS items, or article navigation.

To add an exhibit, copy an existing gallery `.md` file and edit its `title`,
`bigTitle`, `headline`, and `cover`. The Markdown body is rendered below the
headline on the homepage. Use `order` to control its position (ascending),
optional `emphasis` for italic headline text, optional `pageNumber` for the
sticky header, and `draft: true` to hide it.
The homepage sidebar is titled `Recent Blogs` and shows up to the three newest
non-draft entries from `src/content/posts/`, using the existing Gallery Notes
layout.

For a blog article, create a separate file in `src/content/posts/`. Blog posts
never appear in the homepage gallery automatically.

## Adding a subpage

Copy `src/pages/_template.astro.example` to `src/pages/<name>.astro`, edit the props, add a link in `src/components/Menu.astro` if it should appear in nav.

## License

MIT License. Original CodePen layout © Aysenur Turk
