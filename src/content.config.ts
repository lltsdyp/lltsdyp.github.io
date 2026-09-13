import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    bigTitle: z.string(),
    emphasis: z.string().optional(),
    headline: z.string(),
    excerpt: z.string(),
    author: z.string(),
    readTime: z.string().default('5 Min Read'),
    date: z.coerce.date(),
    cover: z.string().url(),
    pageNumber: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Homepage exhibits are independent of blog posts and never generate article routes.
const gallery = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/gallery' }),
  schema: z.object({
    title: z.string(),
    bigTitle: z.string(),
    emphasis: z.string().optional(),
    headline: z.string(),
    excerpt: z.string(),
    author: z.string(),
    date: z.coerce.date(),
    cover: z.string().url(),
    order: z.number(),
    pageNumber: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const featured = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/featured' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    date: z.coerce.date(),
    order: z.number(),
  }),
});

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      year: z.string(),
      cover: z.union([image(), z.string().url()]),
      summary: z.string(),
      url: z.string().url().optional(),
      order: z.number().default(0),
    }),
});

export const collections = { posts, gallery, featured, work };
