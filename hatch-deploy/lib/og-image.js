// --------------------------------------------------------------------------
// OG image generator — renders a 1200×630 PNG from an SVG template.
// Cached in memory after first build (content is static).
// --------------------------------------------------------------------------

import sharp from 'sharp';

const BRAND = '#ff5b1c';
const FG    = '#0a0a0a';
const BG    = '#fafafa';
const MUTED = '#666666';
const FONT  = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

let cached = null;

function buildSvg() {
	const W = 1200;
	const H = 630;
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
	<defs>
		<pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
			<circle cx="2" cy="2" r="1" fill="#dcdcdc"/>
		</pattern>
		<linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="${BRAND}" stop-opacity="0.12"/>
			<stop offset="1" stop-color="${BRAND}" stop-opacity="0"/>
		</linearGradient>
	</defs>

	<!-- Background -->
	<rect width="${W}" height="${H}" fill="${BG}"/>
	<rect width="${W}" height="${H}" fill="url(#dots)" opacity="0.5"/>

	<!-- Decorative orbital rings (top-right) -->
	<circle cx="1060" cy="100" r="220" fill="none" stroke="${BRAND}" stroke-opacity="0.16" stroke-width="1.5"/>
	<circle cx="1060" cy="100" r="160" fill="none" stroke="${BRAND}" stroke-opacity="0.10" stroke-width="1"/>
	<circle cx="1060" cy="100" r="220" fill="url(#ringGrad)"/>

	<!-- Brand mark (top-left) -->
	<g transform="translate(70, 70)">
		<text x="0" y="44" font-size="48" font-family="${FONT}" font-weight="700" fill="${FG}">
			<tspan>🐣</tspan>
			<tspan dx="12">Hatch</tspan>
		</text>
	</g>

	<!-- Headline block -->
	<g transform="translate(70, 220)">
		<text x="0" y="0" font-family="${FONT}" font-weight="800" font-size="78" letter-spacing="-2.5" fill="${FG}">
			<tspan>The fastest way to </tspan><tspan fill="${BRAND}">WordPress</tspan><tspan>.</tspan>
		</text>
		<text x="0" y="100" font-family="${FONT}" font-weight="800" font-size="78" letter-spacing="-2.5" fill="${FG}">
			<tspan fill="${BRAND}">Headless</tspan><tspan>. Edge-delivered.</tspan>
		</text>
		<text x="0" y="200" font-family="${FONT}" font-weight="800" font-size="78" letter-spacing="-2.5" fill="${FG}">
			<tspan>Live in </tspan><tspan fill="${BRAND}">90 seconds</tspan><tspan>.</tspan>
		</text>
	</g>

	<!-- Footer URL + tagline -->
	<g transform="translate(70, 560)">
		<text x="0" y="0" font-family="${FONT}" font-weight="600" font-size="22" fill="${MUTED}">
			hatch.adityaarsharma.com
		</text>
		<text x="0" y="32" font-family="${FONT}" font-weight="500" font-size="18" fill="${MUTED}" letter-spacing="0.3">
			Open source · MIT · Headless WordPress engine
		</text>
	</g>

	<!-- Bottom-right accent pill -->
	<g transform="translate(${W - 70}, 565)">
		<rect x="-220" y="-30" width="220" height="50" rx="25" ry="25" fill="${BRAND}"/>
		<text x="-110" y="3" font-family="${FONT}" font-weight="700" font-size="20" fill="#ffffff" text-anchor="middle">
			Lighthouse 100 · Free
		</text>
	</g>

	<!-- Bottom border accent -->
	<rect x="0" y="${H - 6}" width="${W}" height="6" fill="${BRAND}"/>
</svg>`;
}

async function buildPng() {
	const svg = buildSvg();
	return await sharp(Buffer.from(svg))
		.resize(1200, 630)
		.png({ compressionLevel: 9, quality: 90 })
		.toBuffer();
}

export function registerOgImage(app) {
	app.get('/og.png', async (req, res) => {
		try {
			if (!cached) cached = await buildPng();
			res.setHeader('Content-Type', 'image/png');
			res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, immutable');
			res.setHeader('Content-Length', cached.length);
			return res.end(cached);
		} catch (err) {
			console.error('[og-image] render failed:', err);
			return res.status(500).type('text/plain').send('og render failed');
		}
	});

	// Dev cache-buster — /og.png?rebuild=1 forces a rerender (handy after edits)
	app.get('/og-rebuild', async (req, res) => {
		cached = null;
		try {
			cached = await buildPng();
			res.type('text/plain').send(`rebuilt — ${cached.length} bytes`);
		} catch (err) {
			res.status(500).type('text/plain').send(`rebuild failed: ${err.message}`);
		}
	});
}
