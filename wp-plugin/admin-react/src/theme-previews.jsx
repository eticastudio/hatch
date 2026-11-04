/**
 * Theme SVG mini-previews. 80×48 viewbox per theme. Inlined as React
 * fragments so they ship with the bundle without any extra HTTP requests.
 *
 * Locked from the Claude Design v2 bundle. Each preview hints at the actual
 * frontend layout (heading rhythm, hero, sidebar, palette) so the user picks
 * a theme without bouncing to a demo site.
 */

export const TP = {
	Blog: (
		<svg viewBox="0 0 80 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style={{ width: '100%', display: 'block' }}>
			<rect width="80" height="48" rx="5" fill="#eff6ff" />
			<rect x="6" y="7" width="68" height="14" rx="3" fill="#bfdbfe" />
			<rect x="6" y="25" width="36" height="3" rx="1.5" fill="#3b82f6" opacity="0.7" />
			<rect x="6" y="31" width="68" height="2" rx="1" fill="#3b82f6" opacity="0.2" />
			<rect x="6" y="35" width="55" height="2" rx="1" fill="#3b82f6" opacity="0.2" />
			<rect x="6" y="39" width="62" height="2" rx="1" fill="#3b82f6" opacity="0.2" />
		</svg>
	),
	Tech: (
		<svg viewBox="0 0 80 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style={{ width: '100%', display: 'block' }}>
			<rect width="80" height="48" rx="5" fill="#1e1b4b" />
			<rect x="6" y="7" width="18" height="3" rx="1.5" fill="#a78bfa" />
			<rect x="6" y="14" width="55" height="2" rx="1" fill="#6d28d9" opacity="0.6" />
			<rect x="10" y="19" width="40" height="2" rx="1" fill="#86efac" opacity="0.7" />
			<rect x="10" y="24" width="30" height="2" rx="1" fill="#93c5fd" opacity="0.6" />
			<rect x="6" y="29" width="45" height="2" rx="1" fill="#6d28d9" opacity="0.5" />
			<rect x="10" y="35" width="35" height="2" rx="1" fill="#f9a8d4" opacity="0.5" />
		</svg>
	),
	Data: (
		<svg viewBox="0 0 80 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style={{ width: '100%', display: 'block' }}>
			<rect width="80" height="48" rx="5" fill="#f0fdfa" />
			<rect x="0" y="0" width="22" height="48" rx="5" fill="#0d9488" opacity="0.15" />
			<rect x="3" y="8" width="16" height="2" rx="1" fill="#0d9488" opacity="0.6" />
			<rect x="3" y="13" width="16" height="2" rx="1" fill="#0d9488" opacity="0.35" />
			<rect x="3" y="18" width="16" height="2" rx="1" fill="#0d9488" opacity="0.35" />
			<rect x="26" y="8" width="48" height="3" rx="1.5" fill="#0d9488" opacity="0.5" />
			<rect x="26" y="15" width="48" height="2" rx="1" fill="#374151" opacity="0.2" />
			<rect x="26" y="20" width="40" height="2" rx="1" fill="#374151" opacity="0.2" />
		</svg>
	),
};
