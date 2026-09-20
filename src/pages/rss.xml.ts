import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => +b.data.date - +a.data.date,
  );

  return rss({
    title: "Zimo's Homepage",
    description: 'Notes and essays on systems, LLM inference, and engineering.',
    site: context.site ?? 'https://example.com',
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt,
      author: post.data.author,
      link: `/blog/${post.id}`,
      categories: post.data.tags,
    })),
  });
}
