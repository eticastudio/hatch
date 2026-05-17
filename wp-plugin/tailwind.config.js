/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./blocks-src/**/*.{js,jsx,ts,tsx,html,php}',
		'./build/**/*.{js,html}',
	],
	theme: {
		extend: {
			colors: {
				// Hatch design tokens — Astro starter exposes these as CSS variables.
				background: 'var(--hatch-color-background, #ffffff)',
				surface:    'var(--hatch-color-surface, #f8fafc)',
				foreground: 'var(--hatch-color-foreground, #0f172a)',
				muted:      'var(--hatch-color-muted, #64748b)',
				primary:    'var(--hatch-color-primary, #2563eb)',
				accent:     'var(--hatch-color-accent, #f59e0b)',
				success:    'var(--hatch-color-success, #10b981)',
				danger:     'var(--hatch-color-danger, #ef4444)',
				border:     'var(--hatch-color-border, #e2e8f0)',
			},
			fontFamily: {
				display: ['var(--hatch-font-display, "Inter", ui-sans-serif, system-ui)'],
				body:    ['var(--hatch-font-body, "Inter", ui-sans-serif, system-ui)'],
				mono:    ['var(--hatch-font-mono, ui-monospace, "SF Mono", monospace)'],
			},
		},
	},
	plugins: [],
};
