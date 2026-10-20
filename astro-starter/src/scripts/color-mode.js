/*
 * Hatch color mode. Inlined in <head> by PageLayout so it runs before first
 * paint (no flash) and is registered exactly once per browser tab.
 *
 * Why it lives on `document` and not on the button: with the Astro client
 * router the header is replaced on every navigation, so a listener bound to
 * the button at load time dies after the first page change. A delegated click
 * handler plus re-applying on the router events keeps the toggle working on
 * every page, after Back/Forward, and after a reload.
 *
 * Order of precedence for the active mode:
 *   1. The visitor's own choice (localStorage, or memory when storage is blocked).
 *   2. The site owner's mode from WordPress (data-hatch-default-mode: light or dark).
 *   3. The visitor's system setting (prefers-color-scheme), followed live.
 */
(function () {
  var KEY = 'hatch-color-mode';
  var root = document.documentElement;

  if (window.__hatchColorMode) {
    window.__hatchColorMode.sync();
    return;
  }

  var memory = null;
  var mq = null;
  try {
    mq = window.matchMedia('(prefers-color-scheme: dark)');
  } catch (e) {
    mq = null;
  }

  function valid(v) {
    return v === 'dark' || v === 'light';
  }

  function stored() {
    try {
      var v = window.localStorage.getItem(KEY);
      if (valid(v)) return v;
    } catch (e) {
      /* storage blocked: fall through to the in-memory choice */
    }
    return memory;
  }

  function fallbackMode() {
    var d = root.getAttribute('data-hatch-default-mode');
    if (valid(d)) return d;
    return mq && mq.matches ? 'dark' : 'light';
  }

  function current() {
    return stored() || fallbackMode();
  }

  function paintButtons(mode) {
    var buttons = document.querySelectorAll('[data-hatch-color-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      var dark = mode === 'dark';
      b.setAttribute('aria-pressed', dark ? 'true' : 'false');
      b.setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  function apply(mode) {
    if (root.getAttribute('data-hatch-mode') !== mode) {
      root.setAttribute('data-hatch-mode', mode);
    }
    paintButtons(mode);
  }

  function choose(mode) {
    memory = mode;
    try {
      window.localStorage.setItem(KEY, mode);
    } catch (e) {
      /* storage blocked: the choice still holds for this tab */
    }
    apply(mode);
  }

  function sync() {
    apply(current());
  }

  window.__hatchColorMode = { sync: sync, current: current, choose: choose };

  // Pre-paint.
  sync();

  document.addEventListener('click', function (e) {
    var t = e.target;
    var btn = t && t.closest ? t.closest('[data-hatch-color-toggle]') : null;
    if (!btn) return;
    choose(current() === 'dark' ? 'light' : 'dark');
  });

  // The router builds the next page's <html> from the server HTML, which
  // knows nothing about the visitor's choice. Stamp the right mode on it
  // before the swap so the new page never flashes the wrong theme.
  document.addEventListener('astro:before-swap', function (e) {
    var next = e.newDocument && e.newDocument.documentElement;
    if (next) next.setAttribute('data-hatch-mode', current());
  });
  document.addEventListener('astro:after-swap', sync);
  document.addEventListener('astro:page-load', sync);
  document.addEventListener('DOMContentLoaded', sync);
  window.addEventListener('pageshow', sync);

  // Follow the system setting live, but only while nothing else decides.
  if (mq) {
    var onSystemChange = function () {
      if (!stored()) sync();
    };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  // Another tab changed the choice.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY || e.key === null) sync();
  });
})();
