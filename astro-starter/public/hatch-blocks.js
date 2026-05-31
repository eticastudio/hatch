/**
 * Hatch Blocks runtime — vanilla JS, no framework.
 *
 * Scans for [data-hatch-*] elements and activates each dynamic block:
 *   - hatch/youtube — facade thumbnail → real iframe on click
 *   - hatch/tabs    — click handlers + ARIA wiring
 *   - hatch/search  — rebuild the real <input>/<button> (KSES strips them)
 *   - hatch/form    — fetch /hatch/v1/forms/{id}/embed and inject
 *   - hatch/posts   — fetch /hatch/v1/content/list and render cards
 *
 * Safe to call multiple times — every selector check is idempotent.
 * Designed to run on first DOMContentLoaded AND on every Astro
 * ClientRouter `astro:page-load` event.
 */

(function () {
	'use strict';

	const ALREADY = 'hatchHydrated';

	function each(sel, fn) {
		document.querySelectorAll(sel).forEach((el) => {
			if (el.dataset[ALREADY]) return;
			el.dataset[ALREADY] = '1';
			try { fn(el); } catch (e) { /* keep going */ console && console.warn && console.warn('[hatch]', e); }
		});
	}

	// ─── YouTube facade ─────────────────────────────────────────────────────
	function hydrateYouTube(el) {
		const id = el.getAttribute('data-video-id');
		if (!id) return;
		const controls = el.getAttribute('data-controls') === '1' ? 1 : 0;
		const start = parseInt(el.getAttribute('data-start') || '0', 10) || 0;
		const btn = el.querySelector('.hatch-youtube-play');
		const onPlay = () => {
			const iframe = document.createElement('iframe');
			iframe.src =
				`https://www.youtube-nocookie.com/embed/${ encodeURIComponent(id) }` +
				`?autoplay=1&controls=${ controls }&start=${ start }&rel=0&modestbranding=1`;
			iframe.setAttribute('frameborder', '0');
			iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
			iframe.setAttribute('allowfullscreen', '');
			iframe.style.position = 'absolute';
			iframe.style.inset = '0';
			iframe.style.width = '100%';
			iframe.style.height = '100%';
			iframe.style.border = '0';
			el.innerHTML = '';
			el.appendChild(iframe);
		};
		(btn || el).addEventListener('click', onPlay, { once: true });
		if (btn) btn.style.cursor = 'pointer';
	}

	// ─── Tabs ───────────────────────────────────────────────────────────────
	function hydrateTabs(el) {
		const tabs = el.querySelectorAll('.hatch-tabs-tab');
		const panels = el.querySelectorAll('.hatch-tabs-panel');
		if (!tabs.length) return;
		// Wire ARIA + initial state
		tabs.forEach((t, i) => {
			t.setAttribute('role', 'tab');
			t.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
			t.setAttribute('tabindex', i === 0 ? '0' : '-1');
			t.id = t.id || `hatch-tab-${ Math.random().toString(36).slice(2, 7) }-${ i }`;
		});
		panels.forEach((p, i) => {
			p.setAttribute('role', 'tabpanel');
			if (i !== 0) p.setAttribute('hidden', '');
			else p.removeAttribute('hidden');
		});
		const nav = el.querySelector('.hatch-tabs-nav');
		if (nav) nav.setAttribute('role', 'tablist');

		const activate = (idx) => {
			tabs.forEach((t, i) => {
				const active = i === idx;
				t.classList.toggle('is-active', active);
				t.setAttribute('aria-selected', active ? 'true' : 'false');
				t.setAttribute('tabindex', active ? '0' : '-1');
			});
			panels.forEach((p, i) => {
				const active = i === idx;
				p.classList.toggle('is-active', active);
				if (active) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
			});
		};
		tabs.forEach((t, i) => {
			t.addEventListener('click', () => activate(i));
			t.addEventListener('keydown', (e) => {
				if (e.key === 'ArrowRight') { e.preventDefault(); activate((i + 1) % tabs.length); tabs[(i + 1) % tabs.length].focus(); }
				if (e.key === 'ArrowLeft')  { e.preventDefault(); activate((i - 1 + tabs.length) % tabs.length); tabs[(i - 1 + tabs.length) % tabs.length].focus(); }
				if (e.key === 'Home')        { e.preventDefault(); activate(0); tabs[0].focus(); }
				if (e.key === 'End')         { e.preventDefault(); activate(tabs.length - 1); tabs[tabs.length - 1].focus(); }
			});
		});
	}

	// ─── Search — rebuild the <input>/<button> (KSES strips them) ─────────
	function hydrateSearch(el) {
		const action = el.getAttribute('data-action') || '/search';
		const placeholder = el.getAttribute('data-placeholder') || 'Search…';
		const label = el.getAttribute('data-label') || 'Search';
		// Replace the inner fallback span with a real form
		const form = document.createElement('form');
		form.action = action;
		form.method = 'get';
		form.role = 'search';
		form.style.display = 'contents';
		const input = document.createElement('input');
		input.type = 'search';
		input.name = 'q';
		input.placeholder = placeholder;
		input.setAttribute('aria-label', placeholder);
		input.required = true;
		const button = document.createElement('button');
		button.type = 'submit';
		button.textContent = label;
		form.appendChild(input);
		form.appendChild(button);
		el.innerHTML = '';
		el.appendChild(form);
	}

	// ─── Form — fetch the Plugin Bridge embed ──────────────────────────────
	function hydrateForm(el) {
		const id = el.getAttribute('data-form-id');
		if (!id) return;
		const wpBase = (window.HATCH_WP_BASE || '').replace(/\/$/, '');
		if (!wpBase) {
			el.innerHTML = '<p style="color:var(--hatch-muted)">[Form] HATCH_WP_BASE not set.</p>';
			return;
		}
		fetch(`${ wpBase }/wp-json/hatch/v1/forms/${ encodeURIComponent(id) }/embed`)
			.then((r) => r.ok ? r.text() : Promise.reject(`HTTP ${ r.status }`))
			.then((html) => { el.innerHTML = html; })
			.catch((e) => { el.innerHTML = `<p style="color:var(--hatch-danger,#b91c1c)">[Form ${ id }] ${ e }</p>`; });
	}

	// ─── Posts — fetch list + render cards ────────────────────────────────
	function postsCard(p, opts) {
		const a = document.createElement('a');
		a.className = 'hatch-post-card';
		a.href = p.link || `/blog/${ p.slug }`;
		if (opts.showImage !== '0' && p.featured_media_url) {
			a.innerHTML += `<div class="hatch-post-card-image"><img src="${ p.featured_media_url }" alt="${ (p.featured_media_alt || '').replace(/"/g, '&quot;') }" loading="lazy"></div>`;
		}
		const body = document.createElement('div');
		body.className = 'hatch-post-card-body';
		body.innerHTML = `<h3 class="hatch-post-card-title">${ p.title }</h3>`;
		if (opts.showExcerpt !== '0' && p.excerpt) {
			body.innerHTML += `<p class="hatch-post-card-excerpt">${ p.excerpt }</p>`;
		}
		if (opts.showMeta !== '0') {
			const pub = p.published ? new Date(p.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
			body.innerHTML += `<div class="hatch-post-card-meta">${ pub }</div>`;
		}
		a.appendChild(body);
		return a;
	}

	function hydratePosts(el) {
		// v0.3.14 — Skip if the server already rendered the cards (SSR
		// renderHatchPostsBlocks set data-hatch-hydrated="ssr"). Avoids a
		// flash where the runtime would tear down the SSR'd cards and
		// re-fetch them on the client.
		if (el.getAttribute('data-hatch-hydrated') === 'ssr') return;
		const wpBase = (window.HATCH_WP_BASE || '').replace(/\/$/, '');
		if (!wpBase) {
			el.innerHTML = '<p style="color:var(--hatch-muted)">[Posts] HATCH_WP_BASE not set.</p>';
			return;
		}
		// IMPORTANT: omit empty params. WordPress treats `?author=` (empty)
		// as an author-archive query var and 404s the REST route before it
		// resolves — this surfaces in the browser as a CORS error because
		// the 404 response carries no Access-Control-Allow-Origin header.
		const rawParams = {
			post_type: el.getAttribute('data-post-type') || 'post',
			per_page:  el.getAttribute('data-per-page')  || '6',
			taxonomy:  el.getAttribute('data-taxonomy')  || '',
			term:      el.getAttribute('data-term')      || '',
			author:    el.getAttribute('data-author')    || '',
			orderby:   el.getAttribute('data-order-by')  || 'date',
			order:     el.getAttribute('data-order')     || 'desc',
		};
		const params = new URLSearchParams();
		Object.entries(rawParams).forEach(([k, v]) => { if (v !== '' && v != null) params.set(k, v); });
		const opts = {
			showImage:   el.getAttribute('data-show-image')   || '1',
			showExcerpt: el.getAttribute('data-show-excerpt') || '1',
			showMeta:    el.getAttribute('data-show-meta')    || '1',
		};
		const url = `${ wpBase }/wp-json/hatch/v1/content/list?${ params }`;
		console.log('[hatch] fetching posts:', url);
		fetch(url)
			.then((r) => { console.log('[hatch] posts response:', r.status); return r.ok ? r.json() : Promise.reject(`HTTP ${ r.status }`); })
			.then((data) => {
				const list = Array.isArray(data) ? data : (data.items || []);
				console.log('[hatch] posts rendered:', list.length);
				if (list.length === 0) {
					el.innerHTML = '<p style="color:var(--hatch-muted);grid-column:1/-1">No posts found.</p>';
					return;
				}
				el.innerHTML = '';
				list.forEach((p) => el.appendChild(postsCard(p, opts)));
			})
			.catch((e) => { console.error('[hatch] posts FAILED:', e); el.innerHTML = `<p style="color:var(--hatch-danger,#b91c1c);grid-column:1/-1">[Posts] ${ e }</p>`; });
	}

	// ─── Init ───────────────────────────────────────────────────────────────
	function hatchInit() {
		each('[data-hatch-youtube]', hydrateYouTube);
		each('[data-hatch-tabs]',    hydrateTabs);
		each('[data-hatch-search]',  hydrateSearch);
		each('[data-hatch-form]',    hydrateForm);
		each('[data-hatch-posts]',   hydratePosts);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', hatchInit);
	} else {
		hatchInit();
	}
	// Astro ClientRouter — re-init on each navigation
	document.addEventListener('astro:page-load', hatchInit);
})();
