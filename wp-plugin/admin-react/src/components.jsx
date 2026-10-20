/**
 * Shared UI primitives. Locked from the Claude Design v2 bundle (2026-05-18).
 *
 * Every component here is documented in admin-react/DESIGN-SYSTEM.md. That
 * doc is the contract. Don't roll your own button/toggle/card; extend these.
 */
import { createContext, useContext, useId, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { IC } from './icons';

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
	'#737373': '#f5f5f5',
	'var(--hx-muted)': 'var(--hx-surface-2)',
	'var(--hx-subtle)': 'var(--hx-surface-2)',
	'var(--hx-success)': 'var(--hx-success-soft)',
	'var(--hx-warning)': 'var(--hx-warning-soft)',
	'var(--hx-danger)': 'var(--hx-danger-soft)',
	'var(--hx-info)': 'var(--hx-info-soft)',
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
		aria-hidden="true"
		focusable="false"
		style={{ flexShrink: 0, ...style }}
	>
		{children}
	</svg>
);

// ─── Accessible-name context ───────────────────────────────────────────────
// HxRow and HxField publish the ids of their label and description. HxToggle
// and HxInp read them so a control placed inside either wrapper is named by the
// visible label (aria-labelledby) and described by the help text
// (aria-describedby) without every call site repeating an aria-label. A control
// used outside a wrapper must pass ariaLabel; tests/consistency/admin-a11y-names.mjs
// fails the build check when one is left unnamed.
const HxNameContext = createContext(null);

const nameProps = (ariaLabel, ctx) => {
	if (ariaLabel) {
		return { 'aria-label': ariaLabel, 'aria-describedby': ctx && ctx.descId };
	}
	if (ctx) {
		return { 'aria-labelledby': ctx.labelId, 'aria-describedby': ctx.descId };
	}
	return {};
};

// ─── HxToggle ──────────────────────────────────────────────────────────────
// ON = --hx-fg (black). OFF = --hx-border-2 (grey). NEVER orange.
export const HxToggle = ({ on, onChange, ariaLabel, disabled }) => {
	const ctx = useContext(HxNameContext);
	return (
	<button
		disabled={disabled}
		type="button"
		role="switch"
		aria-checked={on}
		{...nameProps(ariaLabel, ctx)}
		onClick={() => onChange(!on)}
		style={{
			width: 40,
			height: 24,
			borderRadius: 999,
			border: 'none',
			cursor: disabled ? 'not-allowed' : 'pointer',
			opacity: disabled ? 0.5 : 1,
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
				background: on ? 'var(--hx-thumb-on)' : 'var(--hx-thumb)',
				top: 3,
				insetInlineStart: 3,
				transform: on ? 'translateX(calc(16px * var(--hx-dir, 1)))' : 'none',
				transition: 'transform .18s var(--hx-ease), background .18s var(--hx-ease)',
				boxShadow: 'var(--hx-shadow-1)',
				pointerEvents: 'none',
			}}
		/>
	</button>
	);
};

// ─── HxBtn ─────────────────────────────────────────────────────────────────
export const HxBtn = ({ children, variant = 'default', onClick, size = 'md', style: sx = {}, disabled, type = 'button', href, full, ariaLabel, external, ariaExpanded, ariaControls, btnRef }) => {
	const [hov, setHov] = useState(false);
	// v0.50.26. default variant used `bg: --hx-fg` (black in light, white in dark)
	// with a hard-coded `#fff` fg, so in dark mode the button rendered white-on-white
	// (the "Visit live site" bug on the Connection tab). fg now uses --hx-surface so
	// it inverts correctly: light gives black bg + white text, dark gives white bg + dark text.
	const v = {
		// A transparent border keeps the button's outline visible in forced-colors (high contrast) mode.
		default: { bg: 'var(--hx-fg)', fg: 'var(--hx-surface)', bd: '1px solid transparent', wt: 600 },
		brand:   { bg: 'var(--hx-primary)', fg: 'var(--hx-on-primary)', bd: '1px solid transparent', wt: 600 },
		ghost:   { bg: 'var(--hx-surface)', fg: 'var(--hx-fg)', bd: '1px solid var(--hx-border-2)', wt: 500 },
		danger:  { bg: 'var(--hx-danger)', fg: 'var(--hx-on-danger)', bd: '1px solid transparent', wt: 600 },
	}[variant] || {};
	const pad = size === 'sm' ? '7px 14px' : '10px 20px';
	const base = {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
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
		transition: 'opacity .2s var(--hx-ease), transform .2s var(--hx-ease)',
		opacity: disabled ? 0.5 : hov ? 0.84 : 1,
		transform: hov && !disabled ? 'translateY(-1px)' : 'none',
		textDecoration: 'none',
		width: full ? '100%' : undefined,
		...sx,
	};
	if (href) {
		// Open in a new tab only for links that leave this site, or when asked.
		let leaves = !!external;
		if (external === undefined) {
			try { leaves = new URL(href, window.location.href).origin !== window.location.origin; } catch (e) { leaves = false; }
		}
		return (
			<a
				href={href}
				aria-label={ariaLabel}
				target={leaves ? '_blank' : undefined}
				rel={leaves ? 'noopener noreferrer' : undefined}
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
			ref={btnRef}
			type={type}
			aria-label={ariaLabel}
			aria-expanded={ariaExpanded}
			aria-controls={ariaControls}
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
	// Status colours come from the shared state tokens so both admin colour
	// schemes stay readable. Text keeps the normal foreground colour for
	// contrast; the status shows as a small dot.
	const c = {
		neutral: { bg: 'var(--hx-surface-2)' },
		orange:  { bg: 'var(--hx-primary-subtle)', dot: 'var(--hx-primary)' },
		green:   { bg: 'var(--hx-success-subtle)', dot: 'var(--hx-success)' },
		yellow:  { bg: 'var(--hx-warning-subtle)', dot: 'var(--hx-warning)' },
		red:     { bg: 'var(--hx-danger-subtle)', dot: 'var(--hx-danger)' },
		blue:    { bg: 'var(--hx-info-subtle)', dot: 'var(--hx-info)' },
		mono:    { bg: 'var(--hx-surface-2)', mono: true },
	}[color] || { bg: 'var(--hx-surface-2)' };
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				padding: '3px 10px',
				borderRadius: 999,
				fontSize: 12,
				fontWeight: 600,
				lineHeight: 1.6,
				background: c.bg,
				color: 'var(--hx-fg)',
				whiteSpace: 'nowrap',
				fontFamily: c.mono ? 'ui-monospace,SFMono-Regular,Menlo,monospace' : 'inherit',
			}}
		>
			{c.dot && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />}
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
	success: { bg: 'var(--hx-success-soft)', border: 'var(--hx-success-edge)' },
	warning: { bg: 'var(--hx-warning-soft)', border: 'var(--hx-warning-edge)' },
	danger:  { bg: 'var(--hx-danger-soft)', border: 'var(--hx-danger-edge)' },
	info:    { bg: 'var(--hx-info-soft)', border: 'var(--hx-info-edge)' },
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
export const HxRow = ({ label, desc, children, last, tone, stack }) => {
	const uid = useId();
	const ctx = { labelId: uid + '-l', descId: desc ? uid + '-d' : undefined };
	return (
	<div
		className={stack ? 'hx-row hx-row-stack' : 'hx-row'}
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
		<div style={{ flex: '1 1 160px', minWidth: 0 }}>
			<div id={ctx.labelId} className="hx-label" style={{ color: tone === 'danger' ? 'var(--hx-danger)' : 'var(--hx-fg)' }}>{label}</div>
			{desc && (
				<div id={ctx.descId} className="hx-desc" style={{ color: 'var(--hx-subtle)', marginTop: 2 }}>{desc}</div>
			)}
		</div>
		<div className="hx-row-ctl"><HxNameContext.Provider value={ctx}>{children}</HxNameContext.Provider></div>
	</div>
	);
};

// ─── HxHead ────────────────────────────────────────────────────────────────
// Card header: 38×38 icon-box (tint via ibg) + title + desc. mb=20 standard.
export const HxHead = ({ iconChildren, iconColor = 'var(--hx-muted)', title, desc, mb = 20, action, nowrap = false }) => (
	<div style={{ display: 'flex', gap: '10px 14px', alignItems: 'flex-start', flexWrap: nowrap ? 'nowrap' : 'wrap', marginBottom: mb }}>
		<div
			className="hx-ibox"
			style={{
				'--ibc': iconColor,
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
		<div style={{ flex: nowrap ? 1 : '1 1 190px', minWidth: 0, paddingTop: 1 }}>
			<div className="hx-title" style={{ color: 'var(--hx-fg)' }}>{title}</div>
			{desc && (
				<div className="hx-byline" style={{ color: 'var(--hx-subtle)', marginTop: 3 }}>{desc}</div>
			)}
		</div>
		{action && <div style={{ marginInlineStart: 'auto', flexShrink: 0 }}>{action}</div>}
	</div>
);

// Back-compat alias for tabs still importing the old name.
export const HxSectionHead = HxHead;

// ─── HxSeg (segmented control) ─────────────────────────────────────────────
// Pill-based per DESIGN-SYSTEM.md §4, fully rounded container, fully rounded
// active thumb. Matches the dashboard tab nav language.
export const HxSeg = ({ options, value, onChange }) => (
	<div role="group" style={{ display: 'flex', flexWrap: 'wrap', maxWidth: '100%', boxSizing: 'border-box', background: 'var(--hx-surface-2)', borderRadius: 999, padding: 3, gap: 2 }}>
		{options.map((o) => {
			const on = value === o.value;
			return (
				<button
					key={o.value}
					type="button"
					aria-pressed={on}
					onClick={() => onChange(o.value)}
					style={{
						flex: 1,
						padding: '6px 16px',
						borderRadius: 999,
						cursor: 'pointer',
						fontFamily: 'inherit',
						fontSize: 13,
						fontWeight: on ? 600 : 500,
						border: on ? '1.5px solid var(--hx-fg)' : '1.5px solid transparent',
						background: on ? 'var(--hx-surface)' : 'transparent',
						color: on ? 'var(--hx-fg)' : 'var(--hx-subtle)',
						transition: 'background .2s var(--hx-ease), border-color .2s var(--hx-ease), color .2s var(--hx-ease)',
						whiteSpace: 'nowrap',
					}}
				>
					{o.label}
				</button>
			);
		})}
	</div>
);

// ─── HxGL (group label) ────────────────────────────────────────────────────
export const HxGL = ({ children, badge }) => (
	<div
		style={{
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: 10,
			fontSize: 11,
			fontWeight: 700,
			color: 'var(--hx-subtle)',
			textTransform: 'uppercase',
			letterSpacing: '0.07em',
			padding: '18px 0 6px',
		}}
	>
		<span>{children}</span>
		{badge}
	</div>
);
export const HxGroupLabel = HxGL;

// ─── HxInp ─────────────────────────────────────────────────────────────────
const pickDataAttrs = (props) => Object.fromEntries(Object.entries(props).filter(([k]) => k.startsWith('data-')));

export const HxInp = ({ placeholder, value, onChange, mono, type = 'text', full = true, defaultValue, pattern, autoComplete, spellCheck, id, name, ariaLabel, disabled, readOnly, onKeyDown, min, max, step, ...rest }) => {
	const ctx = useContext(HxNameContext);
	return (
	<input
		{...pickDataAttrs(rest)}
		min={min}
		max={max}
		step={step}
		id={id}
		{...nameProps(ariaLabel, ctx)}
		disabled={disabled}
		readOnly={readOnly}
		onKeyDown={onKeyDown}
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
};

// ─── HxNativeInput ─────────────────────────────────────────────────────────
// A plain <input> that takes its accessible name from the enclosing HxRow or
// HxField, for the few controls that need their own styling (number fields).
export const HxNativeInput = ({ 'aria-label': ariaLabel, ...rest }) => {
	const ctx = useContext(HxNameContext);
	return <input {...nameProps(ariaLabel, ctx)} {...rest} />;
};

// ─── Chip (pill picker) ────────────────────────────────────────────────────
export const Chip = ({ label, active, onClick, readOnly }) => {
	const style = {
		padding: '6px 14px',
		borderRadius: 999,
		cursor: readOnly ? 'default' : 'pointer',
		fontFamily: 'inherit',
		fontSize: 13,
		fontWeight: 500,
		border: active ? '1.5px solid var(--hx-fg)' : '1.5px solid var(--hx-border-2)',
		background: active ? 'var(--hx-fg)' : 'var(--hx-surface)',
		color: active ? 'var(--hx-surface)' : 'var(--hx-muted)',
		transition: 'background .2s var(--hx-ease), border-color .2s var(--hx-ease), color .2s var(--hx-ease)',
	};
	if (readOnly) {
		// A status pill, not a control. The word tells screen readers and
		// colour-blind users whether it is on.
		return (
			<span style={{ ...style, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
				<span aria-hidden="true">{active ? '\u2713' : '\u2013'}</span>
				{label}
				<span className="screen-reader-text">{active ? __('On', 'hatch-connect') : __('Off', 'hatch-connect')}</span>
			</span>
		);
	}
	return (
		<button type="button" aria-pressed={!!active} onClick={onClick} style={style}>
			{label}
		</button>
	);
};

// ─── HxCode (inline code inside descriptions) ─────────────────────────────
export const HxCode = ({ children, tone }) => (
	<code
		style={{
			fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
			fontSize: 12,
			padding: '2px 6px',
			borderRadius: 6,
			background: 'var(--hx-surface-2)',
			color: tone === 'warning' ? 'var(--hx-warning)' : 'var(--hx-fg)',
		}}
	>
		{children}
	</code>
);

// ─── HxSelect (native select, same 36px field as HxInp) ───────────────────
// Native <select> so the OS picker, type-ahead and mobile wheel keep working.
// The caret is an inline SVG because appearance:none hides the browser arrow.
// The stroke is the neutral from the icon palette (#737373): a data URI cannot
// read CSS variables, and that value holds contrast on light and dark surfaces.
const SELECT_CARET = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")";
export const HxSelect = ({ value, onChange, children, ariaLabel, id, name, disabled, full = true, minWidth, style: sx = {} }) => {
	const ctx = useContext(HxNameContext);
	const rtl = typeof document !== 'undefined' && 'rtl' === document.documentElement.dir;
	return (
		<select
			id={id}
			name={name}
			value={value}
			onChange={onChange}
			disabled={disabled}
			{...nameProps(ariaLabel, ctx)}
			style={{
				width: full ? '100%' : undefined,
				maxWidth: full ? 'none' : undefined,
				minWidth,
				height: 36,
				paddingBlock: 0,
				paddingInlineStart: 10,
				paddingInlineEnd: 32,
				borderRadius: 8,
				border: '1px solid var(--hx-border-2)',
				fontSize: 13,
				outline: 'none',
				color: 'var(--hx-fg)',
				background: `var(--hx-surface) ${SELECT_CARET} no-repeat ${rtl ? 'left' : 'right'} 10px center`,
				backgroundSize: '12px',
				fontFamily: 'inherit',
				cursor: disabled ? 'not-allowed' : 'pointer',
				appearance: 'none',
				WebkitAppearance: 'none',
				MozAppearance: 'none',
				...sx,
			}}
		>
			{children}
		</select>
	);
};

// ─── HxTag (read-only data pill: name plus an optional count) ──────────────
// Same pill spec as Chip (13px / 500, 999 radius) but a fact, not a control.
export const HxTag = ({ children, count, href, title }) => {
	const style = {
		display: 'inline-flex', alignItems: 'center', gap: 6,
		padding: '6px 14px', borderRadius: 999,
		border: '1.5px solid var(--hx-border-2)', background: 'var(--hx-surface)',
		color: 'var(--hx-fg)', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
		textDecoration: 'none', whiteSpace: 'nowrap',
	};
	const inner = (
		<>
			<span>{children}</span>
			{count !== undefined && count !== null && <span style={{ color: 'var(--hx-subtle)', fontWeight: 500 }}>{count}</span>}
		</>
	);
	return href
		? <a href={href} target="_blank" rel="noopener noreferrer" title={title} style={style}>{inner}</a>
		: <span title={title} style={style}>{inner}</span>;
};

// ─── HxMediaInput, URL field + "Choose from media" wp.media picker ────────
// Combines an HxInp (mono) with a "Choose" button that opens the WordPress
// media library frame. On select, the chosen attachment's URL is written
// back via onChange. Falls back to URL-only if wp.media is unavailable
// (e.g. during dev when wp_enqueue_media() didn't run).
export const HxMediaInput = ({ value, onChange, accept = 'image', placeholder, frameTitle }) => {
	const [pickerError, setPickerError] = useState('');
	const openPicker = () => {
		const wpMedia = (typeof window !== 'undefined' && window.wp && window.wp.media) ? window.wp.media : null;
		if (!wpMedia) {
			setPickerError(__('The media library did not load. Reload the page and try again.', 'hatch-connect'));
			return;
		}
		setPickerError('');
		const frame = wpMedia({
			title: frameTitle || __('Choose an image', 'hatch-connect'),
			multiple: false,
			library: { type: accept },
			button: { text: __('Use this image', 'hatch-connect') },
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
					{__('Choose', 'hatch-connect')}
				</HxBtn>
				{value && (
					<HxBtn variant="ghost" size="sm" onClick={() => onChange({ target: { value: '' } })} type="button" style={{ flexShrink: 0 }}>
						{__('Clear', 'hatch-connect')}
					</HxBtn>
				)}
			</div>
			{pickerError && (
				<div role="alert" className="hx-desc" style={{ color: 'var(--hx-danger-fg, var(--hx-danger))' }}>{pickerError}</div>
			)}
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
					role="img"
					aria-label={__('Preview of the chosen image', 'hatch-connect')}
				/>
			)}
		</div>
	);
};

// ─── HxNotice ──────────────────────────────────────────────────────────────
// Inline message, the one shape for every screen and the "smart inline tip" of
// DESIGN-SYSTEM.md section 9: tinted box, 1px edge, 10px radius, a Lucide
// glyph, bold title, body text and an optional action (a ghost HxBtn).
// tone: info | success | warning | error. Errors use role="alert" so screen
// readers announce them; everything else is a polite status. No side stripes.
const NOTICE_TONE = {
	info:    { bg: 'var(--hx-info-soft)', edge: 'var(--hx-info-edge)', ink: 'var(--hx-info)', icon: IC.info },
	success: { bg: 'var(--hx-success-soft)', edge: 'var(--hx-success-edge)', ink: 'var(--hx-success)', icon: IC.circleCheck },
	warning: { bg: 'var(--hx-warning-soft)', edge: 'var(--hx-warning-edge)', ink: 'var(--hx-warning)', icon: IC.triangleAlert },
	error:   { bg: 'var(--hx-danger-soft)', edge: 'var(--hx-danger-edge)', ink: 'var(--hx-danger)', icon: IC.circleAlert },
};
export const HxNotice = ({ tone = 'info', title, children, action, style: sx = {}, role }) => {
	const t = NOTICE_TONE[tone] || NOTICE_TONE.info;
	// role: pass null when the notice sits inside a live region that already announces it.
	const r = role === undefined ? (tone === 'error' ? 'alert' : 'status') : (role || undefined);
	return (
		<div
			role={r}
			style={{
				background: t.bg,
				border: `1px solid ${t.edge}`,
				borderRadius: 10,
				padding: '12px 14px',
				display: 'flex',
				gap: 12,
				alignItems: 'flex-start',
				...sx,
			}}
		>
			<HxIcon size={16} color={t.ink} style={{ marginTop: 2 }}>{t.icon}</HxIcon>
			<div style={{ flex: '1 1 200px', minWidth: 0, color: 'var(--hx-fg)' }}>
				{title && <div className="hx-label" style={{ fontWeight: 700, marginBottom: children ? 2 : 0 }}>{title}</div>}
				{children && <div className="hx-desc" style={{ color: 'var(--hx-muted)' }}>{children}</div>}
			</div>
			{action && <div style={{ flexShrink: 0, alignSelf: 'center' }}>{action}</div>}
		</div>
	);
};

// ─── HxEmpty ───────────────────────────────────────────────────────────────
// Empty state: a muted Lucide glyph, one line of what is missing and why, and
// an optional action. Used wherever a list can have zero rows.
export const HxEmpty = ({ icon, title, children, action }) => (
	<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, padding: '24px 16px' }}>
		<div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--hx-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
			<HxIcon size={18} color="var(--hx-subtle)">{icon || IC.circleDot}</HxIcon>
		</div>
		<div className="hx-label">{title}</div>
		{children && <div className="hx-desc" style={{ color: 'var(--hx-subtle)', maxWidth: 420 }}>{children}</div>}
		{action && <div style={{ marginTop: 8 }}>{action}</div>}
	</div>
);

// ─── HxDisclosure ──────────────────────────────────────────────────────────
// The one expand/collapse control: a text button with a Lucide chevron that
// turns 90 degrees. Replaces raw <details> and hand-rolled accordions.
// Uncontrolled by default; pass open + onToggle to control it.
export const HxDisclosure = ({ label, children, defaultOpen = false, open, onToggle, badge, style: sx = {} }) => {
	const uid = useId();
	const [inner, setInner] = useState(defaultOpen);
	const isOpen = open === undefined ? inner : open;
	const flip = () => {
		if (open === undefined) setInner(!inner);
		if (onToggle) onToggle(!isOpen);
	};
	return (
		<div style={sx}>
			<button
				type="button"
				onClick={flip}
				aria-expanded={isOpen}
				aria-controls={uid}
				style={{
					background: 'transparent',
					border: 'none',
					padding: '4px 0',
					cursor: 'pointer',
					color: 'var(--hx-muted)',
					fontSize: 13,
					fontWeight: 600,
					fontFamily: 'inherit',
					display: 'inline-flex',
					alignItems: 'center',
					gap: 6,
				}}
			>
				<HxIcon size={14} sw={2.2} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s var(--hx-ease)' }}>{IC.chevronRight}</HxIcon>
				{label}
				{badge}
			</button>
			<div id={uid} hidden={!isOpen} style={{ marginTop: 6 }}>{isOpen && children}</div>
		</div>
	);
};

// ─── HxSpinner ─────────────────────────────────────────────────────────────
export const HxSpinner = ({ size = 16, label }) => (
	<span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--hx-muted)' }}>
		<span
			aria-hidden="true"
			style={{
				width: size,
				height: size,
				borderRadius: '50%',
				border: '2px solid var(--hx-border-2)',
				borderTopColor: 'var(--hx-fg)',
				animation: 'hxSpin 0.8s linear infinite',
				display: 'inline-block',
			}}
		/>
		{label ? <span className="hx-desc">{label}</span> : <span className="screen-reader-text">{__('Loading', 'hatch-connect')}</span>}
	</span>
);

// ─── HxField ───────────────────────────────────────────────────────────────
// Label above a control, with optional help text below. htmlFor must match the
// id of the control inside.
export const HxField = ({ label, htmlFor, help, children }) => {
	const uid = useId();
	const ctx = { labelId: uid + '-l', descId: help ? uid + '-d' : undefined };
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
			<label id={ctx.labelId} htmlFor={htmlFor} className="hx-label" style={{ color: 'var(--hx-fg)' }}>{label}</label>
			<HxNameContext.Provider value={ctx}>{children}</HxNameContext.Provider>
			{help && <div id={ctx.descId} className="hx-desc" style={{ color: 'var(--hx-subtle)' }}>{help}</div>}
		</div>
	);
};

// ─── REST helper ───────────────────────────────────────────────────────────
// Resolves with the parsed body. On a non-2xx response it throws an Error
// whose message is the server's own message (never raw JSON), with the HTTP
// status, the WP_Error code and any extra data attached so a screen can react
// to a specific code.
export async function hxFetch(path, opts = {}) {
	const boot = window.hatchBoot || {};
	const { timeout, ...init } = opts;
	let res;
	let timer = 0;
	let controller = null;
	if (timeout && typeof AbortController !== 'undefined') {
		controller = new AbortController();
		timer = window.setTimeout(() => controller.abort(), timeout);
	}
	try {
		res = await fetch(boot.restUrl + path.replace(/^\//, ''), {
			...init,
			signal: controller ? controller.signal : undefined,
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': boot.nonce,
				...(init.headers || {}),
			},
		});
	} catch (e) {
		const aborted = !!(e && e.name === 'AbortError');
		const err = new Error(
			aborted
				? __('This is taking too long, so Hatch stopped waiting.', 'hatch-connect')
				: __('Could not reach this site. Check your connection and try again.', 'hatch-connect')
		);
		err.status = 0;
		err.code = aborted ? 'hatch_timeout' : 'hatch_network';
		throw err;
	} finally {
		if (timer) window.clearTimeout(timer);
	}
	const ct = res.headers.get('Content-Type') || '';
	const isJson = ct.includes('application/json');
	if (!res.ok) {
		let body = null;
		if (isJson) {
			try { body = await res.json(); } catch (e) { body = null; }
		}
		const err = new Error(
			(body && body.message) ||
			/* translators: %d: HTTP status code such as 500. */
			sprintf(__('The server returned an error (%d). Try again.', 'hatch-connect'), res.status)
		);
		err.status = res.status;
		err.code = (body && body.code) || '';
		err.data = (body && body.data) || null;
		throw err;
	}
	return isJson ? res.json() : res.text();
}

// ─── Plain-language REST errors ────────────────────────────────────────────
// Turns an error thrown by hxFetch into one actionable sentence, plus a small
// support line that keeps the HTTP status and error code. The server's own
// wording is used only when no rule below matches.
export function hxErrorInfo(e) {
	const status = Number((e && e.status) || 0);
	const code = String((e && e.code) || '');
	const data = (e && e.data) || {};
	let message;
	if (code === 'hatch_timeout') {
		message = __('This is taking longer than expected, so Hatch stopped waiting. It may still be running on the server. Wait a minute and check the status before trying again.', 'hatch-connect');
	} else if (status === 0 || code === 'hatch_network') {
		message = __('Could not reach this site. Check your internet connection and try again.', 'hatch-connect');
	} else if (code === 'rest_cookie_invalid_nonce') {
		message = __('Your WordPress session expired. Reload this page, sign in again if asked, then try again.', 'hatch-connect');
	} else if (code === 'rest_forbidden' || code === 'rest_forbidden_context' || code === 'rest_not_logged_in') {
		message = __('Your account is not allowed to do this. Ask a site administrator to do it.', 'hatch-connect');
	} else if (/^hatch_(deploy|check)_/.test(code) && code !== 'hatch_deploy_throttled' && code !== 'hatch_check_throttled' && e && e.message) {
		// Messages written by Hatch for its own checks are already plain and specific.
		message = e.message;
	} else if (code === 'hatch_cf_auth' || status === 401) {
		message = __('Cloudflare did not accept this token. It may have been revoked, have expired, or been copied in part. Create a new token and paste it again.', 'hatch-connect');
	} else if (code === 'hatch_cf_permission' || status === 403) {
		message = __('This token is missing a permission Hatch needs for this step. Open the token in Cloudflare, add the missing permission, save it, then try again.', 'hatch-connect');
	} else if (status === 429 || code === 'hatch_cf_rate_limited' || code === 'hatch_deploy_throttled') {
		const wait = Number(data.retry_after || 0);
		message = wait > 0
			? sprintf(
				/* translators: %d: number of seconds to wait. */
				_n('Too many attempts in a short time. Wait %d second, then try again.', 'Too many attempts in a short time. Wait %d seconds, then try again.', wait, 'hatch-connect'),
				wait
			)
			: __('Too many attempts in a short time. Wait a minute, then try again.', 'hatch-connect');
	} else if (status >= 500) {
		message = __('Cloudflare or this server is not responding right now. Nothing was changed. Try again in a few minutes.', 'hatch-connect');
	} else if (code === 'hatch_cf_rejected' && status === 400) {
		message = __('That does not look like a Cloudflare API token. Copy it again from the token page and paste it without spaces.', 'hatch-connect');
	} else {
		message = (e && e.message) || __('Something went wrong. Try again.', 'hatch-connect');
	}
	const bits = [];
	if (status > 0) {
		/* translators: %d: HTTP status code, for example 400. */
		bits.push(sprintf(__('HTTP %d', 'hatch-connect'), status));
	}
	if (code) {
		bits.push(code);
	}
	if (data.cf_code) {
		/* translators: %d: numeric error code returned by Cloudflare. */
		bits.push(sprintf(__('Cloudflare error %d', 'hatch-connect'), Number(data.cf_code)));
	}
	const detail = bits.length ? sprintf(
		/* translators: %s: technical details such as HTTP 400, hatch_cf_rejected. Shown in small print for support. */
		__('Details for support: %s', 'hatch-connect'),
		bits.join(', ')
	) : '';
	return { message, detail };
}

// Which Connection tab action fixes the error, as named by the server:
// "change_token", "change_domain", "retry", "setup", "wp_credential" or "".
export function hxErrorFix(e) {
	const fix = e && e.data && e.data.fix;
	return typeof fix === 'string' ? fix : '';
}

// Same, as a node ready to drop into a HxNotice: sentence plus the small support line.
export function hxErrorNode(e) {
	const { message, detail } = hxErrorInfo(e);
	return (
		<>
			{message}
			{detail && (
				<span className="hx-help" style={{ display: 'block', marginTop: 4, color: 'var(--hx-subtle)', fontSize: 11 }}>{detail}</span>
			)}
		</>
	);
}
