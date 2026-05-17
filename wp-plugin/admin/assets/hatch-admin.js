/**
 * Hatch admin — Save = inline spinner + tick (no full page reload from the
 * user's perspective until the redirect lands).
 *
 * Hooks every <form> inside .wrap that posts to admin-post.php (every Hatch
 * Save form does). On submit:
 *   - disables the button + replaces label with a spinning indicator
 *   - on the next tick, shows a green tick for ~600 ms before the WP
 *     redirect actually navigates the page
 *
 * Pure progressive enhancement — no JS, the form still works.
 *
 * @since 0.50.0
 */
(function () {
	'use strict';

	function isHatchSaveForm(form) {
		if (!form) return false;
		// form.method is shadowed by <input name="method"> if present, and
		// form.action is shadowed by <input name="action"> (WP admin-post forms
		// ALWAYS have one). Read the raw HTML attributes via getAttribute() so
		// we never resolve to a child input element by accident.
		var method = (form.getAttribute('method') || 'get').toLowerCase();
		if (method !== 'post') return false;
		var action = (form.getAttribute('action') || '').toLowerCase();
		return action.indexOf('admin-post.php') !== -1;
	}

	function decorate(btn) {
		if (!btn || btn.dataset.hxDecorated === '1') return;
		btn.dataset.hxDecorated = '1';
		var originalLabel = btn.innerHTML;

		btn.dataset.hxOriginalLabel = originalLabel;
		btn.classList.add('hx-save-btn');

		// Inject minimal spinner + tick markup inline.
		btn.innerHTML =
			'<span class="hx-save-default">' + originalLabel + '</span>' +
			'<span class="hx-save-busy" aria-hidden="true" style="display:none; align-items:center; gap:6px;">' +
				'<span class="hx-save-spinner" style="display:inline-block; width:14px; height:14px; border:2px solid currentColor; border-top-color:transparent; border-radius:50%; animation:hxSpin .7s linear infinite;"></span>' +
				'<span>Saving…</span>' +
			'</span>' +
			'<span class="hx-save-done" aria-hidden="true" style="display:none; align-items:center; gap:6px;">' +
				'<span aria-hidden="true">✓</span><span>Saved</span>' +
			'</span>';
	}

	function showBusy(btn) {
		if (!btn) return;
		btn.disabled = true;
		btn.querySelector('.hx-save-default').style.display = 'none';
		btn.querySelector('.hx-save-busy').style.display    = 'inline-flex';
	}

	// Inject the keyframes once (Tailwind admin CSS doesn't define hxSpin).
	function injectKeyframes() {
		if (document.getElementById('hx-save-keyframes')) return;
		var s = document.createElement('style');
		s.id = 'hx-save-keyframes';
		s.textContent = '@keyframes hxSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
		document.head.appendChild(s);
	}

	function init() {
		injectKeyframes();
		var forms = document.querySelectorAll('.wrap form, .hatch-shell form');
		forms.forEach(function (form) {
			if (!isHatchSaveForm(form)) return;
			var btn = form.querySelector('button[type=submit], input[type=submit]');
			if (!btn || btn.tagName === 'INPUT') return; // <input> doesn't support innerHTML swap
			decorate(btn);
			form.addEventListener('submit', function () { showBusy(btn); });
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
