/*
 * Behaviour shared by every header: mobile drawer, cart count, hide-on-scroll.
 *
 * Loaded as a bundled module, so it runs once per tab. Everything listens on
 * `document` or `window` and looks the elements up when it needs them. That is
 * what keeps it working after the Astro client router swaps in a new header.
 */
(function () {
  var DESKTOP = '(min-width: 1024px)';

  function parts() {
    return {
      btn: document.querySelector('.hatch-hamburger'),
      drawer: document.getElementById('hatch-mobile-drawer'),
    };
  }

  function closeDrawer() {
    var p = parts();
    if (!p.btn || !p.drawer) return;
    p.btn.classList.remove('is-open');
    p.drawer.classList.remove('is-open');
    p.btn.setAttribute('aria-expanded', 'false');
    p.btn.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('hatch-drawer-open');
  }

  function toggleDrawer() {
    var p = parts();
    if (!p.btn || !p.drawer) return;
    if (p.drawer.classList.contains('is-open')) {
      closeDrawer();
      return;
    }
    p.btn.classList.add('is-open');
    p.drawer.classList.add('is-open');
    p.btn.setAttribute('aria-expanded', 'true');
    p.btn.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('hatch-drawer-open');
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('.hatch-hamburger')) {
      toggleDrawer();
    } else if (t.closest('#hatch-mobile-drawer a')) {
      closeDrawer();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer();
  });

  var desktop = window.matchMedia ? window.matchMedia(DESKTOP) : null;
  if (desktop) {
    if (desktop.addEventListener) desktop.addEventListener('change', closeDrawer);
    else if (desktop.addListener) desktop.addListener(closeDrawer);
  }

  /* Cart count: the header renders a hidden pill inside every cart link. The
     product page's Add to cart script dispatches `hatch:cart:changed`. */
  function paintCart(count) {
    var show = isFinite(count) && count > 0;
    var pills = document.querySelectorAll('[data-hatch-cart-count]');
    for (var i = 0; i < pills.length; i++) {
      pills[i].textContent = show ? String(count) : '';
      pills[i].hidden = !show;
    }
    var links = document.querySelectorAll('[data-hatch-cart-link]');
    for (var j = 0; j < links.length; j++) {
      var label = links[j].querySelector('span:not([data-hatch-cart-count])');
      if (label) continue; // drawer rows carry a visible "Cart" label already
      links[j].setAttribute('aria-label', show ? 'Cart, ' + count + (count === 1 ? ' item' : ' items') : 'Cart');
    }
  }

  function refreshCart() {
    if (!document.querySelector('[data-hatch-cart-link]')) return;
    fetch('/api/wc-store/cart', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !Array.isArray(d.items)) return;
        paintCart(d.items.reduce(function (n, it) { return n + (it.quantity || 0); }, 0));
      })
      .catch(function () { /* the count simply stays hidden */ });
  }

  window.addEventListener('hatch:cart:changed', refreshCart);

  /* Hide-on-scroll: one scroll listener for the tab; the header element is
     looked up per event so a swapped-in header is picked up automatically. */
  var lastY = window.scrollY;
  window.addEventListener('scroll', function () {
    var hide = document.querySelector('.hatch-header-hide-on-scroll');
    if (!hide) return;
    var y = window.scrollY;
    hide.style.transition = 'transform .22s ease';
    hide.style.transform = y > 80 && y > lastY ? 'translateY(-100%)' : 'translateY(0)';
    lastY = y;
  }, { passive: true });

  document.addEventListener('astro:page-load', function () {
    closeDrawer();
    lastY = window.scrollY;
    refreshCart();
  });
  // Without the client router there is no page-load event, so count once now.
  if (!document.querySelector('meta[name="astro-view-transitions-enabled"]')) refreshCart();
})();
