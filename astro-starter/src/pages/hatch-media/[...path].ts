import type { APIRoute } from 'astro';

/**
 * Hatch Media Proxy
 *
 * Catch-all route that serves WordPress media under a clean frontend path.
 * The Hatch plugin rewrites every `<wp_origin>/wp-content/uploads/<path>` to
 * `<frontend>/hatch-media/<path>` in REST responses + rendered HTML, so the
 * browser never sees `wp-content` in your markup.
 *
 * This route fetches the original media from WordPress and streams it back,
 * with aggressive cache headers. Optionally pipes through Astro's built-in
 * image service for on-the-fly WebP/AVIF when `?w=` is present.
 *
 * Env:
 *   WP_API_URL — set by Hatch install, points at https://wp.example.com/wp-json/wp/v2.
 *                We derive the origin from it.
 */

const WP_ORIGIN = (() => {
	const apiUrl = (import.meta.env.WP_API_URL || '').replace(/\/wp-json\/.*$/, '');
	if (apiUrl) return apiUrl;
	// Fallback: local dev default — matches the docker-compose port in the wp-plugin repo.
	return 'http://localhost:8810';
})();

export const prerender = false;

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'tiff']);

function pickBestImageFormat(accept: string | null): 'avif' | 'webp' | null {
	if (!accept) return 'webp';
	const a = accept.toLowerCase();
	if (a.includes('image/avif')) return 'avif';
	if (a.includes('image/webp')) return 'webp';
	return null; // browser prefers original — pass through
}

export const GET: APIRoute = async ({ params, request, url }) => {
	const path = (params as { path?: string }).path;
	if (!path) {
		return new Response('Not found', { status: 404 });
	}

	// Build upstream URL. Reject path-traversal early.
	if (path.includes('..')) {
		return new Response('Bad request', { status: 400 });
	}

	const upstreamUrl = `${WP_ORIGIN}/wp-content/uploads/${path}`;
	const ext = (path.split('.').pop() || '').toLowerCase();
	const isImage = IMAGE_EXTS.has(ext);

	// For images, delegate to the existing /img backend so the user gets
	// WebP/AVIF on-the-fly via the same Sharp/Wasm pipeline that Astro
	// uses everywhere else. Falls back to direct stream on /img failure.
	if (isImage) {
		const bestFormat = pickBestImageFormat(request.headers.get('accept'));
		if (bestFormat) {
			const imgUrl = new URL('/img', url.origin);
			imgUrl.searchParams.set('url', upstreamUrl);
			imgUrl.searchParams.set('format', bestFormat);
			// Honor optional ?w= passed by frontend components.
			const w = url.searchParams.get('w');
			if (w) imgUrl.searchParams.set('w', w);
			const q = url.searchParams.get('q');
			if (q) imgUrl.searchParams.set('q', q);

			try {
				const opt = await fetch(imgUrl, { signal: AbortSignal.timeout(15_000) });
				if (opt.ok) {
					return new Response(opt.body, {
						status: 200,
						headers: {
							'Content-Type': opt.headers.get('content-type') || `image/${bestFormat}`,
							'Cache-Control': 'public, max-age=31536000, immutable',
							'Vary': 'Accept',
							'X-Hatch-Media': `optimized:${bestFormat}`,
							'Access-Control-Allow-Origin': '*',
						},
					});
				}
			} catch { /* fall through to direct stream */ }
		}
	}

	// Non-image media (videos, audio, PDFs, zips) and image fallback — stream
	// the original binary. WP serves correct Content-Type already.
	let upstream: Response;
	try {
		upstream = await fetch(upstreamUrl, {
			signal: AbortSignal.timeout(30_000), // longer for video
			headers: { 'User-Agent': 'Hatch-Media-Proxy/1.0' },
		});
	} catch {
		return new Response('Upstream timeout', { status: 504 });
	}

	if (!upstream.ok) {
		return new Response('Not found', { status: upstream.status });
	}

	// Preserve range headers so <video> seeking works.
	const headers: Record<string, string> = {
		'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
		'Cache-Control': 'public, max-age=31536000, immutable',
		'X-Hatch-Media': 'stream',
		'Access-Control-Allow-Origin': '*',
	};
	const acceptRanges = upstream.headers.get('accept-ranges');
	if (acceptRanges) headers['Accept-Ranges'] = acceptRanges;
	const contentLength = upstream.headers.get('content-length');
	if (contentLength) headers['Content-Length'] = contentLength;

	return new Response(upstream.body, { status: upstream.status, headers });
};
