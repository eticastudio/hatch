/**
 * Shared UI primitives. Locked from the Claude Design v2 bundle (2026-05-18).
 *
 * Every component here is documented in admin-react/DESIGN-SYSTEM.md — that
 * doc is the contract. Don't roll your own button/toggle/card; extend these.
 */
import { useState } from '@wordpress/element';

// ─── ibg(): icon-box background tint ────────────────────────────────────────
// Maps each saturated icon colour to its soft companion. Every HxHead must
// pass its colour through this so the palette stays harmonised.
const IBGS = {
	'#ff6b00': '#fff3e8',
	'#2563eb': '#eff6ff',
	'#16a34a': '#f0fdf4',
	'#d97706': '#fffbeb',
	'#b91c1c': '#fef2f2',
	'#8b5cf6': '#f5f3ff',
	'#0d9488': '#f0fdfa',
	'#6366f1': '#eef2ff',
	'#10b981': '#ecfdf5',
	'#ef4444': '#fef2f2',
	'#f97316': '#fff7ed',
	'#737373': '#f5f5f5',
	'var(--hx-muted)': '#f4f4f5',
};
export const ibg = (c) => IBGS[c] || c + '18';

// ─── HxIcon ─────────────────────────────────────────────────────────────────
export const HxIcon = ({ size = 16, color = 'currentColor', sw = 1.75, children, style }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke={color}
		strokeWidth={sw}
		strokeLinecap="round"
		strokeLinejoin="round"
		style={{ flexShrink: 0, ...style }}
	>
		{children}
	</svg>
);

// ─── HxToggle ──────────────────────────────────────────────────────────────
// ON = --hx-fg (black). OFF = --hx-border-2 (grey). NEVER orange.
export const HxToggle = ({ on, onChange, ariaLabel }) => (
	<button
		type="button"
		role="switch"
		aria-checked={on}
		aria-label={ariaLabel}
		onClick={() => onChange(!on)}
		style={{
			width: 40,
			height: 24,
			borderRadius: 999,
			border: 'none',
			cursor: 'pointer',
			background: on ? 'var(--hx-fg)' : 'var(--hx-border-2)',
			position: 'relative',
			transition: 'background .18s var(--hx-ease)',
			flexShrink: 0,
			padding: 0,
		}}
	>
		<span
			style={{
				position: 'absolute',
				width: 18,
				height: 18,
				borderRadius: '50%',
				background: '#fff',
				top: 3,
				left: on ? 19 : 3,
				transition: 'left .18s var(--hx-ease)',
				boxShadow: '0 1px 4px rgba(0,0,0,.22)',
				pointerEvents: 'none',
			}}
		/>
	</button>
);

// ─── HxBtn ─────────────────────────────────────────────────────────────────
export const HxBtn = ({ children, variant = 'default', onClick, size = 'md', style: sx = {}, disabled, type = 'button', href, full }) => {
	const [hov, setHov] = useState(false);
	const v = {
		default: { bg: 'var(--hx-fg)', fg: '#fff', bd: 'none', wt: 600 },
		brand:   { bg: 'var(--hx-primary)', fg: '#fff', bd: 'none', wt: 600 },
		ghost:   { bg: 'var(--hx-surface)', fg: 'var(--hx-fg)', bd: '1px solid var(--hx-border-2)', wt: 500 },
		danger:  { bg: 'var(--hx-danger)', fg: '#fff', bd: 'none', wt: 600 },
	}[variant] || {};
	const pad = size === 'sm' ? '7px 14px' : '10px 20px';
	const base = {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		padding: pad,
		borderRadius: 999,
		cursor: disabled ? 'not-allowed' : 'pointer',
		fontSize: 14,
		fontWeight: v.wt,
		lineHeight: 1,
		fontFamily: 'inherit',
		background: v.bg,
		color: v.fg,
		border: v.bd || 'none',
		transition: 'opacity .15s, transform .15s var(--hx-ease)',
		opacity: disabled ? 0.5 : hov ? 0.84 : 1,
		transform: hov && !disabled ? 'translateY(-1px)' : 'none',
		textDecoration: 'none',
		width: full ? '100%' : undefined,
		...sx,
	};
	if (href) {
		return (
			<a
				href={href}
				target={href.startsWith('http') ? '_blank' : undefined}
				rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
				onMouseEnter={() => setHov(true)}
				onMouseLeave={() => setHov(false)}
				style={base}
			>
				{children}
			</a>
		);
	}
	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled}
			onMouseEnter={() => setHov(true)}
			onMouseLeave={() => setHov(false)}
			style={base}
		>
			{children}
		</button>
	);
};

// ─── HxBadge ───────────────────────────────────────────────────────────────
export const HxBadge = ({ children, color = 'neutral' }) => {
	const c = {
		neutral: { bg: 'var(--hx-surface-2)', fg: 'var(--hx-muted)' },
		orange:  { bg: 'var(--hx-primary-3)', fg: 'var(--hx-primary)' },
		green:   { bg: '#f0fdf4', fg: '#16a34a' },
		yellow:  { bg: '#fffbeb', fg: '#d97706' },
		red:     { bg: '#fef2f2', fg: '#b91c1c' },
		blue:    { bg: '#eff6ff', fg: '#2563eb' },
		mono:    { bg: 'var(--hx-surface-2)', fg: 'var(--hx-muted)', mono: true },
	}[color] || {};
	return (
		<span
			style={{
				display: 'inline-block',
				padding: '3px 10px',
				borderRadius: 999,
				fontSize: 12,
				fontWeight: 600,
				lineHeight: 1.6,
				background: c.bg,
				color: c.fg,
				whiteSpace: 'nowrap',
				fontFamily: c.mono ? 'ui-monospace,SFMono-Regular,Menlo,monospace' : 'inherit',
			}}
		>
			{children}
		</span>
	);
};

// ─── HxCard ────────────────────────────────────────────────────────────────
// hover prop: subtle box-shadow lift. Only use when the whole card IS the
// click target (or invites scrutiny). Static info cards leave it off.
//
// status prop: 'success' | 'warning' | 'danger' | 'info' tints border + bg
// per DESIGN-SYSTEM.md §2. Use for inline callouts (going-headless info,
// no-app-password warning, etc.) instead of hand-rolled coloured divs.
const CARD_STATUS = {
	success: { bg: '#f0fdf4', border: '#bbf7d0' },
	warning: { bg: '#fffbeb', border: '#fed7aa' },
	danger:  { bg: '#fef2f2', border: '#fecaca' },
	info:    { bg: '#eff6ff', border: '#bfdbfe' },
};
export const HxCard = ({ children, style: sx = {}, hover, status, as: As = 'div', ...rest }) => {
	const s = status && CARD_STATUS[status] ? CARD_STATUS[status] : null;
	return (
		<As
			{...rest}
			className={hover ? 'hx-card-hover' : undefined}
			style={{
				background: s ? s.bg : 'var(--hx-surface)',
				border: `1px solid ${s ? s.border : 'var(--hx-border)'}`,
				borderRadius: 14,
				padding: 22,
				...sx,
			}}
		>
			{children}
		</As>
	);
};

// ─── HxRow ─────────────────────────────────────────────────────────────────
export const HxRow = ({ label, desc, children, last }) => (
	<div
		style={{
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: 20,
			padding: '13px 0',
			borderBottom: last ? 'none' : '1px solid var(--hx-border)',
			minHeight: 44,
		}}
	>
		<div style={{ flex: 1 }}>
			<div className="hx-label" style={{ color: 'var(--hx-fg)' }}>{label}</div>
			{desc && (
				<div className="hx-desc" style={{ color: 'var(--hx-subtle)', marginTop: 2 }}>{desc}</div>
			)}
		</div>
		<div style={{ flexShrink: 0 }}>{children}</div>
	</div>
);

// ─── HxHead ────────────────────────────────────────────────────────────────
// Card header: 38×38 icon-box (tint via ibg) + title + desc. mb=20 standard.
export const HxHead = ({ iconChildren, iconColor = 'var(--hx-muted)', title, desc, mb = 20, action }) => (
	<div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: mb }}>
		<div
			style={{
				width: 38,
				height: 38,
				borderRadius: 10,
				flexShrink: 0,
				background: ibg(iconColor),
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<HxIcon size={18} color={iconColor}>{iconChildren}</HxIcon>
		</div>
		<div style={{ flex: 1, paddingTop: 1 }}>
			<div className="hx-title" style={{ color: 'var(--hx-fg)' }}>{title}</div>
			{desc && (
				<div className="hx-byline" style={{ color: 'var(--hx-subtle)', marginTop: 3 }}>{desc}</div>
			)}
		</div>
		{action}
	</div>
);

// Back-compat alias for tabs still importing the old name.
export const HxSectionHead = HxHead;

// ─── HxSeg (segmented control) ─────────────────────────────────────────────
// Pill-based per DESIGN-SYSTEM.md §4 — fully rounded container, fully rounded
// active thumb. Matches the dashboard tab nav language.
export const HxSeg = ({ options, value, onChange }) => (
	<div style={{ display: 'flex', background: 'var(--hx-surface-2)', borderRadius: 999, padding: 3, gap: 2, border: '1px solid var(--hx-border)' }}>
		{options.map((o) => (
			<button
				key={o.value}
				type="button"
				onClick={() => onChange(o.value)}
				style={{
					flex: 1,
					padding: '7px 16px',
					borderRadius: 999,
					cursor: 'pointer',
					fontFamily: 'inherit',
					fontSize: 13,
					fontWeight: value === o.value ? 600 : 500,
					border: 'none',
					background: value === o.value ? 'var(--hx-surface)' : 'transparent',
					color: value === o.value ? 'var(--hx-fg)' : 'var(--hx-subtle)',
					boxShadow: value === o.value ? '0 1px 4px rgba(0,0,0,.08), 0 0 0 0.5px rgba(0,0,0,.06)' : 'none',
					transition: 'all .15s var(--hx-ease)',
					whiteSpace: 'nowrap',
				}}
			>
				{o.label}
			</button>
		))}
	</div>
);

// ─── HxGL (group label) ────────────────────────────────────────────────────
export const HxGL = ({ children }) => (
	<div
		style={{
			fontSize: 11,
			fontWeight: 700,
			color: 'var(--hx-subtle)',
			textTransform: 'uppercase',
			letterSpacing: '0.07em',
			padding: '18px 0 6px',
		}}
	>
		{children}
	</div>
);
export const HxGroupLabel = HxGL;

// ─── HxInp ─────────────────────────────────────────────────────────────────
export const HxInp = ({ placeholder, value, onChange, mono, type = 'text', full = true, defaultValue, pattern, autoComplete, spellCheck, id, name }) => (
	<input
		id={id}
		name={name}
		type={type}
		placeholder={placeholder}
		value={value}
		defaultValue={defaultValue}
		onChange={onChange}
		pattern={pattern}
		autoComplete={autoComplete}
		spellCheck={spellCheck}
		style={{
			width: full ? '100%' : undefined,
			height: 36,
			padding: '0 10px',
			borderRadius: 8,
			border: '1px solid var(--hx-border-2)',
			fontSize: 13,
			outline: 'none',
			color: 'var(--hx-fg)',
			background: 'var(--hx-surface)',
			fontFamily: mono ? 'ui-monospace,SFMono-Regular,Menlo,monospace' : 'inherit',
			transition: 'border-color .15s var(--hx-ease), box-shadow .15s var(--hx-ease)',
			boxSizing: 'border-box',
		}}
		onFocus={(e) => { e.target.style.borderColor = 'var(--hx-fg)'; }}
		onBlur={(e) => { e.target.style.borderColor = 'var(--hx-border-2)'; }}
	/>
);

// ─── Chip (pill picker) ────────────────────────────────────────────────────
export const Chip = ({ label, active, onClick }) => (
	<button
		type="button"
		onClick={onClick}
		style={{
			padding: '7px 14px',
			borderRadius: 999,
			cursor: 'pointer',
			fontFamily: 'inherit',
			fontSize: 13,
			fontWeight: 500,
			border: active ? '1.5px solid var(--hx-fg)' : '1px solid var(--hx-border-2)',
			background: active ? 'var(--hx-fg)' : 'var(--hx-surface)',
			color: active ? 'var(--hx-surface)' : 'var(--hx-muted)',
			transition: 'all .15s var(--hx-ease)',
		}}
	>
		{label}
	</button>
);

// ─── HxMediaInput — URL field + "Choose from media" wp.media picker ────────
// Combines an HxInp (mono) with a "Choose" button that opens the WordPress
// media library frame. On select, the chosen attachment's URL is written
// back via onChange. Falls back to URL-only if wp.media is unavailable
// (e.g. during dev when wp_enqueue_media() didn't run).
export const HxMediaInput = ({ value, onChange, accept = 'image', placeholder = 'https://… or choose from media', frameTitle = 'Choose an image' }) => {
	const openPicker = () => {
		const wpMedia = (typeof window !== 'undefined' && window.wp && window.wp.media) ? window.wp.media : null;
		if (!wpMedia) {
			window.alert('Media library not loaded. Reload the page and try again.');
			return;
		}
		const frame = wpMedia({
			title: frameTitle,
			multiple: false,
			library: { type: accept },
			button: { text: 'Use this' },
		});
		frame.on('select', () => {
			const att = frame.state().get('selection').first().toJSON();
			if (att && att.url) {
				onChange({ target: { value: att.url } });
			}
		});
		frame.open();
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
			<div style={{ display: 'flex', gap: 8 }}>
				<HxInp
					value={value || ''}
					onChange={onChange}
					placeholder={placeholder}
					mono
				/>
				<HxBtn variant="ghost" size="sm" onClick={openPicker} type="button" style={{ flexShrink: 0 }}>
					Choose
				</HxBtn>
				{value && (
					<HxBtn variant="ghost" size="sm" onClick={() => onChange({ target: { value: '' } })} type="button" style={{ flexShrink: 0 }}>
						Clear
					</HxBtn>
				)}
			</div>
			{value && (
				<div
					style={{
						width: 64,
						height: 64,
						borderRadius: 8,
						border: '1px solid var(--hx-border)',
						background: `var(--hx-surface-2) url("${value}") center / contain no-repeat`,
					}}
					title={value}
				/>
			)}
		</div>
	);
};

// ─── REST helper ───────────────────────────────────────────────────────────
export async function hxFetch(path, opts = {}) {
	const boot = window.hatchBoot || {};
	const res = await fetch(boot.restUrl + path.replace(/^\//, ''), {
		...opts,
		credentials: 'same-origin',
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce': boot.nonce,
			...(opts.headers || {}),
		},
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(body || `HTTP ${res.status}`);
	}
	const ct = res.headers.get('Content-Type') || '';
	return ct.includes('application/json') ? res.json() : res.text();
}
