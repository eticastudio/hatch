/**
 * Hatch Blocks fetch helper (server-only). Mirrors astro-starter/src/lib/blocks.ts.
 *
 * /wp-json/hatch/v1/post/{id}/blocks returns a normalised tree of blocks. For
 * v1 of the Next.js starter we treat post.content.rendered as the canonical
 * rendered HTML (the same approach the Astro starter uses by default), and
 * defer the typed renderer.
 */
import { wpJsonBase } from './hatch';

export interface HatchBlock {
  name: string;
  attrs: Record<string, unknown>;
  innerHTML: string;
  innerBlocks: HatchBlock[];
}

export interface HatchBlocksResponse {
  meta: { id: number; slug: string; title: string; modified: string; block_count: number };
  blocks: HatchBlock[];
}

export async function fetchPostBlocks(postId: number, context: 'view' | 'edit' = 'view'): Promise<HatchBlocksResponse | null> {
  const base = wpJsonBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/hatch/v1/post/${postId}/blocks?context=${context}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as HatchBlocksResponse;
  } catch {
    return null;
  }
}
