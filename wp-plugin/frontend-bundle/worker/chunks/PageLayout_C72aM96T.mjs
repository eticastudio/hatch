globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, T as unescapeHTML, _ as addAttribute, a as Fragment, c as renderSlot, d as renderTemplate, g as renderHead, h as maybeRenderHead, i as renderComponent, v as defineScriptVars, y as createRenderInstruction } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { r as WP_API_URL } from "./server_BKSwzYCg.mjs";
import { n as getFeatures, r as hasFeature } from "./features_Ccz4SEbt.mjs";
import { i as getMenus } from "./hatch_it4n8Llv.mjs";
//#region node_modules/astro/dist/runtime/server/render/script.js
async function renderScript(result, id) {
	const inlined = result.inlinedScripts.get(id);
	let content = "";
	if (inlined != null) {
		if (inlined) content = `<script type="module">${inlined}<\/script>`;
	} else {
		const resolved = await result.resolve(id);
		content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"><\/script>`;
	}
	return createRenderInstruction({
		type: "script",
		id,
		content
	});
}
//#endregion
//#region src/styles/theme-blog.css?url
var theme_blog_default = "/_astro/theme-blog.BkO_mnda.css";
//#endregion
//#region src/styles/theme-tech.css?url
var theme_tech_default = "/_astro/theme-tech.CONtm-W8.css";
//#endregion
//#region src/styles/theme-docs.css?url
var theme_docs_default = "/_astro/theme-docs.D1dJ4h32.css";
//#endregion
//#region src/styles/theme-astropaper.css?url
var theme_astropaper_default = "/_astro/theme-astropaper.5XhoKjoR.css";
//#endregion
//#region src/styles/theme-astrowind.css?url
var theme_astrowind_default = "/_astro/theme-astrowind.L9C9w3uY.css";
//#endregion
//#region src/styles/theme-astronano.css?url
var theme_astronano_default = "/_astro/theme-astronano.L_nyqgul.css";
//#endregion
//#region node_modules/astro/components/ClientRouter.astro
createAstro("http://localhost:4321");
var $$ClientRouter = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$ClientRouter;
	const { fallback = "animate" } = Astro.props;
	return renderTemplate`<meta name="astro-view-transitions-enabled" content="true"><meta name="astro-view-transitions-fallback"${addAttribute(fallback, "content")}>${renderScript($$result, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/node_modules/astro/components/ClientRouter.astro?astro&type=script&index=0&lang.ts")}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/node_modules/astro/components/ClientRouter.astro", void 0);
//#endregion
//#region src/components/SiteHeader.astro
createAstro("http://localhost:4321");
var $$SiteHeader = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$SiteHeader;
	const { features, menuItems = [] } = Astro.props;
	const siteName = features.site.name || "Hatch";
	const logoUrl = (features.site.logo_url || "").trim();
	const headerCfg = features.aesthetic.header;
	const headerStickyClass = headerCfg.sticky === "static" ? "relative" : headerCfg.sticky === "hide_on_scroll" ? "sticky top-0 hatch-header-hide-on-scroll" : "sticky top-0";
	const headerBgClass = headerCfg.blur ? "bg-hatch-bg/95 backdrop-blur" : "bg-hatch-bg";
	const showColorModeBtn = headerCfg.color_mode_button;
	const brandDisplay = headerCfg.brand_display || "auto";
	const showLogo = !!logoUrl && brandDisplay !== "text";
	const showText = brandDisplay === "text" || brandDisplay === "both" || !showLogo;
	const topItems = menuItems.filter((item) => item.parent === 0).sort((a, b) => a.order - b.order);
	const fallbackNav = [];
	if ((features.home.posts_page_id ?? 0) > 0 && features.home.posts_page_slug) {
		const slug = features.home.posts_page_slug;
		fallbackNav.push({
			href: "/" + slug,
			label: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " "),
			target: ""
		});
	}
	const navItems = topItems.length > 0 ? topItems.map((item) => ({
		href: item.url,
		label: item.title,
		target: item.target
	})) : fallbackNav;
	const currentPath = Astro.url.pathname;
	const isActive = (href) => href === "/" ? currentPath === "/" : currentPath.startsWith(href);
	const showAuth = (/* @__PURE__ */ new Set([
		"/cart",
		"/cart/",
		"/checkout",
		"/checkout/",
		"/account",
		"/account/",
		"/shop",
		"/shop/",
		"/login",
		"/login/",
		"/register",
		"/register/",
		"/order-summary",
		"/order-summary/"
	])).has(currentPath) || [
		"/shop/",
		"/product/",
		"/cart/",
		"/checkout/",
		"/account/",
		"/order-summary/"
	].some((p) => currentPath.startsWith(p));
	const accountHref = `/account`;
	const authLabel = "Account";
	const theme = (features.theme || "blog").toLowerCase();
	features?.version || features?.hatch_version;
	(/* @__PURE__ */ new Date()).toLocaleDateString(features.site.language || "en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric"
	});
	return renderTemplate`${(theme === "blog" || !["tech", "docs"].includes(theme)) && renderTemplate`${maybeRenderHead($$result)}<header${addAttribute(`hatch-header hatch-header-blog ${headerStickyClass} z-40 ${headerBgClass}`, "class")} data-astro-cid-fzpbxy5g><div class="mx-auto px-5 sm:px-8" style="max-width: var(--hatch-max-width, 1180px)" data-astro-cid-fzpbxy5g><div class="hatch-header-inner" data-astro-cid-fzpbxy5g><a href="/" class="hatch-blog-wordmark" data-astro-cid-fzpbxy5g>${showLogo && renderTemplate`<img${addAttribute(logoUrl, "src")}${addAttribute(siteName, "alt")} class="h-8 w-auto max-w-[220px] inline-block align-middle" loading="eager" data-astro-cid-fzpbxy5g>`}${showText && renderTemplate`<span data-astro-cid-fzpbxy5g>${siteName}</span>`}</a>${(navItems.length > 0 || showAuth) && renderTemplate`<nav class="hatch-blog-navrow hidden lg:flex" aria-label="Primary" data-astro-cid-fzpbxy5g>${navItems.map((item) => renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(item.target || void 0, "target")}${addAttribute([isActive(item.href) ? "is-active" : ""], "class:list")} data-astro-cid-fzpbxy5g>${item.label}</a>`)}${showAuth && renderTemplate`<a href="/cart"${addAttribute([isActive("/cart") ? "is-active" : ""], "class:list")} data-astro-cid-fzpbxy5g>Cart</a>`}${showAuth && renderTemplate`<a${addAttribute(accountHref, "href")} data-hatch-auth-link${addAttribute([isActive(accountHref) ? "is-active" : ""], "class:list")} data-astro-cid-fzpbxy5g>${authLabel}</a>`}</nav>`}<form role="search" method="get" action="/search" class="hatch-header-search hidden lg:flex" aria-label="Site search" data-astro-cid-fzpbxy5g><label class="hatch-header-search__label" for="hatch-header-search-input" data-astro-cid-fzpbxy5g><span class="sr-only" data-astro-cid-fzpbxy5g>Search</span></label><input id="hatch-header-search-input" type="search" name="q" placeholder="Search" autocomplete="off" data-astro-cid-fzpbxy5g></form><button type="button" class="hatch-hamburger lg:hidden inline-flex items-center justify-center w-10 h-10" aria-label="Open menu" aria-controls="hatch-mobile-drawer" aria-expanded="false" data-astro-cid-fzpbxy5g><svg class="h-5 w-5 hatch-icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-astro-cid-fzpbxy5g><line x1="3" y1="6" x2="21" y2="6" data-astro-cid-fzpbxy5g></line><line x1="3" y1="12" x2="21" y2="12" data-astro-cid-fzpbxy5g></line><line x1="3" y1="18" x2="21" y2="18" data-astro-cid-fzpbxy5g></line></svg><svg class="h-5 w-5 hatch-icon-close hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-astro-cid-fzpbxy5g><line x1="18" y1="6" x2="6" y2="18" data-astro-cid-fzpbxy5g></line><line x1="6" y1="6" x2="18" y2="18" data-astro-cid-fzpbxy5g></line></svg></button></div></div></header>`}${theme === "tech" && renderTemplate`<header${addAttribute(`hatch-header hatch-header-tech ${headerStickyClass} z-40 ${headerBgClass}`, "class")} data-astro-cid-fzpbxy5g><div class="mx-auto px-5 sm:px-8" style="max-width: var(--hatch-max-width, 1240px)" data-astro-cid-fzpbxy5g><div class="hatch-header-inner" data-astro-cid-fzpbxy5g><a href="/" class="hatch-tech-brand" data-astro-cid-fzpbxy5g>${showLogo && renderTemplate`<img${addAttribute(logoUrl, "src")}${addAttribute(siteName, "alt")} class="h-5 w-auto max-w-[140px] mr-2" loading="eager" data-astro-cid-fzpbxy5g>`}${showText && renderTemplate`<span data-astro-cid-fzpbxy5g>${siteName}</span>`}</a><nav class="hatch-tech-nav hidden lg:inline-flex" aria-label="Primary" data-astro-cid-fzpbxy5g>${navItems.map((item) => renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(item.target || void 0, "target")}${addAttribute([isActive(item.href) ? "is-active" : ""], "class:list")} data-astro-cid-fzpbxy5g>${item.label}</a>`)}${showAuth && renderTemplate`<a href="/cart"${addAttribute([isActive("/cart") ? "is-active" : ""], "class:list")} data-astro-cid-fzpbxy5g>Cart</a>`}${showAuth && renderTemplate`<a${addAttribute(accountHref, "href")} data-hatch-auth-link${addAttribute([isActive(accountHref) ? "is-active" : ""], "class:list")} data-astro-cid-fzpbxy5g>${authLabel}</a>`}</nav><form role="search" method="get" action="/search" class="hatch-header-search hidden lg:flex" aria-label="Site search" data-astro-cid-fzpbxy5g><input type="search" name="q" placeholder="Search" autocomplete="off" aria-label="Search" data-astro-cid-fzpbxy5g></form><button type="button" class="hatch-hamburger lg:hidden inline-flex items-center justify-center w-9 h-9" style="border: 1px solid var(--hatch-border); border-radius: 3px; color: var(--hatch-fg-muted);" aria-label="Open menu" aria-controls="hatch-mobile-drawer" aria-expanded="false" data-astro-cid-fzpbxy5g><svg class="h-4 w-4 hatch-icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-astro-cid-fzpbxy5g><line x1="3" y1="6" x2="21" y2="6" data-astro-cid-fzpbxy5g></line><line x1="3" y1="12" x2="21" y2="12" data-astro-cid-fzpbxy5g></line><line x1="3" y1="18" x2="21" y2="18" data-astro-cid-fzpbxy5g></line></svg><svg class="h-4 w-4 hatch-icon-close hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-astro-cid-fzpbxy5g><line x1="18" y1="6" x2="6" y2="18" data-astro-cid-fzpbxy5g></line><line x1="6" y1="6" x2="18" y2="18" data-astro-cid-fzpbxy5g></line></svg></button></div></div></header>`}${theme === "docs" && renderTemplate`<header${addAttribute(`hatch-header hatch-header-docs ${headerStickyClass} z-40 ${headerBgClass}`, "class")} data-astro-cid-fzpbxy5g><div class="mx-auto px-5 sm:px-8" style="max-width: var(--hatch-max-width, 1180px)" data-astro-cid-fzpbxy5g><div class="hatch-header-inner" data-astro-cid-fzpbxy5g><a href="/" class="hatch-docs-brand" data-astro-cid-fzpbxy5g>${showLogo && renderTemplate`<img${addAttribute(logoUrl, "src")}${addAttribute(siteName, "alt")} class="h-6 w-auto max-w-[160px]" loading="eager" data-astro-cid-fzpbxy5g>`}${showText && renderTemplate`<span data-astro-cid-fzpbxy5g>${siteName}</span>`}</a><nav class="hatch-docs-nav hidden lg:inline-flex" aria-label="Primary" data-astro-cid-fzpbxy5g>${navItems.map((item) => renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(item.target || void 0, "target")}${addAttribute([isActive(item.href) ? "is-active" : ""], "class:list")} data-astro-cid-fzpbxy5g>${item.label}</a>`)}${showAuth && renderTemplate`<a href="/cart"${addAttribute([isActive("/cart") ? "is-active" : ""], "class:list")} data-astro-cid-fzpbxy5g>Cart</a>`}${showAuth && renderTemplate`<a${addAttribute(accountHref, "href")} data-hatch-auth-link${addAttribute([isActive(accountHref) ? "is-active" : ""], "class:list")} data-astro-cid-fzpbxy5g>${authLabel}</a>`}</nav><form role="search" method="get" action="/search" class="hatch-header-search hidden lg:flex" aria-label="Site search" data-astro-cid-fzpbxy5g><input type="search" name="q" placeholder="Search" autocomplete="off" aria-label="Search" data-astro-cid-fzpbxy5g></form><button type="button" class="hatch-hamburger hatch-docs-mobile-toggle lg:hidden inline-flex items-center justify-center w-9 h-9" style="border-radius: 6px; color: var(--hatch-fg-muted);" aria-label="Open menu" aria-controls="hatch-mobile-drawer" aria-expanded="false" data-astro-cid-fzpbxy5g><svg class="h-4 w-4 hatch-icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-astro-cid-fzpbxy5g><line x1="3" y1="6" x2="21" y2="6" data-astro-cid-fzpbxy5g></line><line x1="3" y1="12" x2="21" y2="12" data-astro-cid-fzpbxy5g></line><line x1="3" y1="18" x2="21" y2="18" data-astro-cid-fzpbxy5g></line></svg><svg class="h-4 w-4 hatch-icon-close hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-astro-cid-fzpbxy5g><line x1="18" y1="6" x2="6" y2="18" data-astro-cid-fzpbxy5g></line><line x1="6" y1="6" x2="18" y2="18" data-astro-cid-fzpbxy5g></line></svg></button></div></div></header>`}${showColorModeBtn && renderTemplate`<button id="hatch-color-mode-btn" type="button" aria-label="Toggle color mode" title="Toggle color mode" class="hatch-color-mode-toggle" style="position: fixed; top: 14px; right: 14px; z-index: 60; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid var(--hatch-border); background: var(--hatch-bg); color: var(--hatch-fg-muted); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); cursor: pointer; transition: color 140ms ease, border-color 140ms ease;" data-astro-cid-fzpbxy5g><svg class="hatch-cm-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-astro-cid-fzpbxy5g><circle cx="12" cy="12" r="4" data-astro-cid-fzpbxy5g></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" data-astro-cid-fzpbxy5g></path></svg><svg class="hatch-cm-moon hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-astro-cid-fzpbxy5g><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" data-astro-cid-fzpbxy5g></path></svg></button>`}<div id="hatch-mobile-drawer" class="hatch-drawer lg:hidden hidden border-t border-hatch-border bg-hatch-bg" data-astro-cid-fzpbxy5g><nav class="mx-auto px-5 sm:px-8 py-3 flex flex-col gap-1" aria-label="Primary mobile" style="max-width: var(--hatch-max-width, 1180px)" data-astro-cid-fzpbxy5g><form role="search" method="get" action="/search" class="hatch-header-search hatch-header-search--mobile flex mb-2" aria-label="Site search" data-astro-cid-fzpbxy5g><input type="search" name="q" placeholder="Search" autocomplete="off" aria-label="Search" style="flex:1;padding:10px 12px;border:1px solid var(--hatch-border);border-radius:6px;background:var(--hatch-bg-2);color:var(--hatch-fg);font-size:14px;" data-astro-cid-fzpbxy5g></form>${navItems.map((item) => renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(item.target || void 0, "target")}${addAttribute(["px-3 py-3 rounded-md text-[14px] font-medium transition-colors", isActive(item.href) ? "text-hatch-fg bg-hatch-bg-3" : "text-hatch-fg-muted hover:text-hatch-fg hover:bg-hatch-bg-2"], "class:list")} data-astro-cid-fzpbxy5g>${item.label}</a>`)}${showAuth && renderTemplate`<a href="/cart"${addAttribute(["px-3 py-3 rounded-md text-[14px] font-medium transition-colors", isActive("/cart") ? "text-hatch-fg bg-hatch-bg-3" : "text-hatch-fg-muted hover:text-hatch-fg hover:bg-hatch-bg-2"], "class:list")} data-astro-cid-fzpbxy5g>Cart</a>`}${showAuth && renderTemplate`<a${addAttribute(accountHref, "href")} data-hatch-auth-link${addAttribute(["px-3 py-3 rounded-md text-[14px] font-medium transition-colors", isActive(accountHref) ? "text-hatch-fg bg-hatch-bg-3" : "text-hatch-fg-muted hover:text-hatch-fg hover:bg-hatch-bg-2"], "class:list")} data-astro-cid-fzpbxy5g>${authLabel}</a>`}</nav></div><script>
  (function () {
    var btn = document.querySelector('.hatch-hamburger');
    var drawer = document.getElementById('hatch-mobile-drawer');
    if (!btn || !drawer) return;
    function close() {
      btn.classList.remove('is-open');
      drawer.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open menu');
      document.body.classList.remove('hatch-drawer-open');
    }
    function toggle() {
      var open = !drawer.classList.contains('is-open');
      if (open) {
        btn.classList.add('is-open');
        drawer.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        btn.setAttribute('aria-label', 'Close menu');
        document.body.classList.add('hatch-drawer-open');
      } else {
        close();
      }
    }
    btn.addEventListener('click', toggle);
    drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    var mq = window.matchMedia('(min-width: 1024px)');
    (mq.addEventListener ? mq.addEventListener('change', close) : mq.addListener(close));
  })();
<\/script><script>
  (function () {
    var btn = document.getElementById('hatch-color-mode-btn');
    if (btn) {
      var sun = btn.querySelector('.hatch-cm-sun');
      var moon = btn.querySelector('.hatch-cm-moon');
      var apply = function (m) {
        document.documentElement.setAttribute('data-hatch-mode', m);
        try { localStorage.setItem('hatch-color-mode', m); } catch (e) {}
        if (sun && moon) {
          // v0.5.5 — Show the icon of the mode you'll get by clicking.
          // Dark mode → sun icon (click → light). Light mode → moon icon (click → dark).
          if (m === 'dark') { moon.classList.add('hidden'); sun.classList.remove('hidden'); }
          else              { sun.classList.add('hidden'); moon.classList.remove('hidden'); }
        }
      };
      try {
        var saved = localStorage.getItem('hatch-color-mode');
        if (saved) apply(saved);
        else {
          var cur = document.documentElement.getAttribute('data-hatch-mode') || 'auto';
          if (cur === 'auto') {
            var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            apply(prefersDark ? 'dark' : 'light');
          }
        }
      } catch (e) {}
      btn.addEventListener('click', function () {
        var now = document.documentElement.getAttribute('data-hatch-mode') === 'dark' ? 'light' : 'dark';
        apply(now);
      });
    }

    /* Cart badge: finds every Cart-link in the header, injects a live
       count pill next to the label, and keeps it in sync with the Woo
       Store API cart. The [data-hatch-cart-count] hook is also written
       by the product-page Add-to-Cart script for instant local updates
       without a round-trip. */
    (function initCartBadge() {
      var cartLinks = Array.prototype.filter.call(
        document.querySelectorAll('a'),
        function (a) {
          var href = (a.getAttribute('href') || '').toLowerCase();
          return /^\\/cart\\/?($|\\?)/.test(href) || /\\/cart\\/?$/.test(href);
        }
      );
      if (!cartLinks.length) return;
      cartLinks.forEach(function (a) {
        if (a.querySelector('[data-hatch-cart-count]')) return;
        var pill = document.createElement('span');
        pill.setAttribute('data-hatch-cart-count', '');
        pill.className = 'hatch-cart-badge';
        pill.setAttribute('aria-label', 'Items in cart');
        pill.hidden = true;
        a.appendChild(document.createTextNode(' '));
        a.appendChild(pill);
      });
      var paint = function (n) {
        var visible = Number.isFinite(n) && n > 0;
        document.querySelectorAll('[data-hatch-cart-count]').forEach(function (el) {
          el.textContent = String(visible ? n : '');
          el.hidden = !visible;
        });
      };
      /* Same-origin proxy path (see astro-starter/src/pages/api/wc-store).
         Direct /wp-json/... would hit Astro's origin on dev, not WP's. */
      var refresh = function () {
        fetch('/api/wc-store/cart', { credentials: 'include', headers: { Accept: 'application/json' } })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) {
            if (!d || !Array.isArray(d.items)) return;
            paint(d.items.reduce(function (n, it) { return n + (it.quantity || 0); }, 0));
          })
          .catch(function () {});
      };
      refresh();
      window.addEventListener('hatch:cart:changed', refresh);
    })();

    var hide = document.querySelector('.hatch-header-hide-on-scroll');
    if (hide) {
      var lastY = window.scrollY;
      hide.style.transition = 'transform .22s ease';
      addEventListener('scroll', function () {
        var y = window.scrollY;
        if (y > 80 && y > lastY) hide.style.transform = 'translateY(-100%)';
        else                     hide.style.transform = 'translateY(0)';
        lastY = y;
      }, { passive: true });
    }
  })();
<\/script>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/SiteHeader.astro", void 0);
//#endregion
//#region src/components/HatchCredit.astro
createAstro("http://localhost:4321");
var $$HatchCredit = createComponent(($$result, $$props, $$slots) => {
	const Astro2 = $$result.createAstro($$props, $$slots);
	Astro2.self = $$HatchCredit;
	const { show } = Astro2.props;
	const creditUrl = String("").trim();
	const safeUrl = /^https:\/\//i.test(creditUrl) ? creditUrl : "";
	return renderTemplate`${show && (safeUrl ? renderTemplate`${maybeRenderHead($$result)}<a${addAttribute(safeUrl, "href")} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-[12px] text-hatch-fg-subtle hover:text-hatch-fg transition-colors"><span>Built with <span class="text-hatch-fg-muted font-medium">Hatch</span></span></a>` : renderTemplate`<span class="inline-flex items-center gap-1.5 text-[12px] text-hatch-fg-subtle">Built with <span class="text-hatch-fg-muted font-medium">Hatch</span></span>`)}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/HatchCredit.astro", void 0);
//#endregion
//#region src/components/SiteFooter.astro
createAstro("http://localhost:4321");
var $$SiteFooter = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$SiteFooter;
	const { features, menuItems = [] } = Astro.props;
	const siteName = features.site.name || "Hatch";
	const tagline = features.site.description || "";
	const logoUrl = (features.site.logo_url || "").trim();
	const year = (/* @__PURE__ */ new Date()).getFullYear();
	const showBuiltBy = hasFeature(features, "built_by_hatch");
	const theme = (features.theme || "blog").toLowerCase();
	const footerItems = menuItems.filter((item) => item.parent === 0).sort((a, b) => a.order - b.order);
	const fallbackLinks = [{
		href: "/",
		label: "Home",
		target: ""
	}];
	if ((features.home.posts_page_id ?? 0) > 0 && features.home.posts_page_slug) {
		const slug = features.home.posts_page_slug;
		fallbackLinks.push({
			href: "/" + slug,
			label: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " "),
			target: ""
		});
	}
	fallbackLinks.push({
		href: "/rss.xml",
		label: "RSS",
		target: ""
	}, {
		href: "/sitemap-index.xml",
		label: "Sitemap",
		target: ""
	});
	const navLinks = footerItems.length > 0 ? footerItems.map((item) => ({
		href: item.url,
		label: item.title,
		target: item.target
	})) : fallbackLinks;
	const docsVersion = features?.version || features?.hatch_version || "v1";
	`${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}${docsVersion}`;
	return renderTemplate`${(theme === "blog" || !["tech", "docs"].includes(theme)) && renderTemplate`${maybeRenderHead($$result)}<footer class="hatch-footer"><div class="mx-auto px-5 sm:px-8" style="max-width: var(--hatch-max-width, 1180px)">${logoUrl ? renderTemplate`<a href="/" class="inline-block"><img${addAttribute(logoUrl, "src")}${addAttribute(siteName, "alt")} class="h-8 w-auto mx-auto opacity-90" loading="lazy"></a>` : renderTemplate`<h2 class="hatch-footer-wordmark">${siteName}</h2>`}${tagline && renderTemplate`<p class="hatch-footer-tagline">${tagline}</p>`}<nav class="hatch-footer-links" aria-label="Footer">${navLinks.map((link) => renderTemplate`<a${addAttribute(link.href, "href")}${addAttribute(link.target || void 0, "target")}>${link.label}</a>`)}</nav><div class="hatch-footer-meta">${`© ${year} · ${siteName}`}</div><div class="mt-2">${renderComponent($$result, "HatchCredit", $$HatchCredit, { "show": showBuiltBy })}</div></div></footer>`}${theme === "tech" && renderTemplate`<footer class="hatch-footer"><div class="mx-auto px-5 sm:px-8" style="max-width: var(--hatch-max-width, 1240px)"><div class="hatch-footer-prompt">${siteName.toLowerCase()}</div><nav class="hatch-footer-links" aria-label="Footer">${navLinks.map((link) => renderTemplate`<a${addAttribute(link.href, "href")}${addAttribute(link.target || void 0, "target")}>${link.label}</a>`)}</nav><div class="hatch-footer-meta">${`# © ${year}`}</div><div class="mt-2">${renderComponent($$result, "HatchCredit", $$HatchCredit, { "show": showBuiltBy })}</div></div></footer>`}${theme === "docs" && renderTemplate`<footer class="hatch-footer"><div class="mx-auto px-5 sm:px-8" style="max-width: var(--hatch-max-width, 1180px)"><div class="hatch-footer-brand">${siteName}</div><nav class="hatch-footer-links" aria-label="Footer">${navLinks.map((link) => renderTemplate`<a${addAttribute(link.href, "href")}${addAttribute(link.target || void 0, "target")}>${link.label}</a>`)}</nav><div class="hatch-footer-meta">© ${year} · ${siteName}</div><div class="mt-2">${renderComponent($$result, "HatchCredit", $$HatchCredit, { "show": showBuiltBy })}</div></div></footer>`}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/SiteFooter.astro", void 0);
//#endregion
//#region src/lib/design.ts
var DENSITY_SPACE = {
	compact: "0.75",
	comfortable: "1",
	spacious: "1.25"
};
var ROUNDED_RADIUS = {
	sharp: "4px",
	smooth: "10px",
	extra: "20px"
};
var BUTTON_RADIUS = {
	pill: "9999px",
	rounded: "10px",
	sharp: "4px"
};
var norm = (v) => String(v ?? "").toLowerCase().replace(/px$/, "").replace(/\s+/g, "");
var normRounded = (v) => {
	const x = norm(v);
	if (x === "default") return "smooth";
	if (x === "extraround") return "extra";
	return x;
};
var SHADOW_MAP = {
	none: "none",
	soft: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
	medium: "0 4px 6px rgba(0,0,0,0.05), 0 10px 15px rgba(0,0,0,0.08)",
	dramatic: "0 20px 25px rgba(0,0,0,0.10), 0 8px 10px rgba(0,0,0,0.04)"
};
var HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
function hexToRgb(hex) {
	const m = HEX_RE.exec(String(hex).trim());
	if (!m) return null;
	let h = m[1];
	if (h.length === 3) h = h.split("").map((c) => c + c).join("");
	return [
		parseInt(h.slice(0, 2), 16),
		parseInt(h.slice(2, 4), 16),
		parseInt(h.slice(4, 6), 16)
	];
}
var toLin = (v) => {
	v /= 255;
	return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
};
var fromLin = (v) => {
	const c = v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - .055;
	return Math.round(Math.min(1, Math.max(0, c)) * 255);
};
function toOklab([r, g, b]) {
	const R = toLin(r), G = toLin(g), B = toLin(b);
	const l = Math.cbrt(.4122214708 * R + .5363325363 * G + .0514459929 * B);
	const m = Math.cbrt(.2119034982 * R + .6806995451 * G + .1073969566 * B);
	const s = Math.cbrt(.0883024619 * R + .2817188376 * G + .6299787005 * B);
	return [
		.2104542553 * l + .793617785 * m - .0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + .4505937099 * s,
		.0259040371 * l + .7827717662 * m - .808675766 * s
	];
}
function fromOklab([L, a, b]) {
	const l = Math.pow(L + .3963377774 * a + .2158037573 * b, 3);
	const m = Math.pow(L - .1055613458 * a - .0638541728 * b, 3);
	const s = Math.pow(L - .0894841775 * a - 1.291485548 * b, 3);
	return [
		fromLin(4.0767416621 * l - 3.3077115913 * m + .2309699292 * s),
		fromLin(-1.2684380046 * l + 2.6097574011 * m - .3413193965 * s),
		fromLin(-.0041960863 * l - .7034186147 * m + 1.707614701 * s)
	];
}
var relLum = ([r, g, b]) => .2126 * toLin(r) + .7152 * toLin(g) + .0722 * toLin(b);
/** Text colour (near-black or white) with the higher contrast on the lifted dark-mode primary. */
function darkPrimaryForeground(primary) {
	const rgb = hexToRgb(primary);
	if (!rgb) return null;
	const [L, a, b] = toOklab(rgb);
	const [wl, wa, wb] = toOklab([
		255,
		255,
		255
	]);
	const lum = relLum(fromOklab([
		L * .7 + wl * .3,
		a * .7 + wa * .3,
		b * .7 + wb * .3
	]));
	const onWhite = 1.05 / (lum + .05);
	return (lum + .05) / (relLum([
		11,
		13,
		16
	]) + .05) >= onWhite ? "#0b0d10" : "#ffffff";
}
/**
* The Design tab bg/fg pair feeds the themes' LIGHT-mode surface. A preset that
* stores a dark pair (the Terminal preset does) would otherwise paint a dark
* page while the light-mode ramps stay light, so the toggle's "light" state came
* out unreadable. Dark mode has its own hard-coded surface in every theme, so a
* dark pair is simply not inlined.
*/
function lightSurfacePair(bg, fg) {
	const bgRgb = hexToRgb(String(bg ?? ""));
	const fgRgb = hexToRgb(String(fg ?? ""));
	if (!bgRgb || !fgRgb) return {};
	if (relLum(bgRgb) < .4 || relLum(fgRgb) > .4) return {};
	return {
		"--hatch-fg-design": String(fg),
		"--hatch-bg-design": String(bg)
	};
}
/** True when the Design tab bg/fg pair is dark-first (see lightSurfacePair). */
function isDarkFirst(bg, fg) {
	return Object.keys(lightSurfacePair(bg, fg)).length === 0 && !!hexToRgb(String(bg ?? ""));
}
/**
* A dark-first preset stores a brand colour tuned for dark surfaces (Terminal:
* #22d3ee). On the light surface that reads 1.6:1 as text, so darken it in oklab
* until it clears 5.2:1 against white (leaves headroom for the off-white light surface). Returns the input when it already does.
*/
function readableOnLight(primary) {
	const rgb = hexToRgb(primary);
	if (!rgb) return primary;
	let [L, a, b] = toOklab(rgb);
	for (let i = 0; i < 40; i++) {
		const [r, g, bl] = fromOklab([
			L,
			a,
			b
		]);
		if (1.05 / (relLum([
			r,
			g,
			bl
		]) + .05) >= 5.2) return "#" + [
			r,
			g,
			bl
		].map((v) => v.toString(16).padStart(2, "0")).join("");
		L *= .97;
		a *= .97;
		b *= .97;
	}
	return primary;
}
function designToCssVars(design) {
	if (!design) return "";
	const b = design.brand;
	const l = design.layout;
	const br = design.borders || {};
	const bp = design.breakpoints || {};
	const density = DENSITY_SPACE[norm(l.density)] || DENSITY_SPACE.comfortable;
	ROUNDED_RADIUS[normRounded(l.rounded ?? l.roundness)] || ROUNDED_RADIUS.smooth;
	const maxWidth = norm(l.max_width ?? l.maxWidth) || "1160";
	const buttonStyle = BUTTON_RADIUS[norm(l.button_style ?? l.buttonStyle)] || BUTTON_RADIUS.pill;
	const borderColor = String(br.color || "#e5e5e5");
	const shadow = SHADOW_MAP[String(br.shadow || "soft").toLowerCase()] || SHADOW_MAP.soft;
	const bpMobile = Number(bp.mobile) || 640;
	const bpTablet = Number(bp.tablet) || 1024;
	const bpDesktop = Number(bp.desktop) || 1280;
	const vars = {
		"--hatch-primary": isDarkFirst(b.bg, b.fg) ? readableOnLight(b.primary) : b.primary,
		"--hatch-primary-brand": b.primary,
		...darkPrimaryForeground(b.primary) ? { "--hatch-primary-fg-dark": darkPrimaryForeground(b.primary) } : {},
		"--hatch-accent": b.accent,
		...lightSurfacePair(b.bg, b.fg),
		"--hatch-density": density,
		"--hatch-button-radius": buttonStyle,
		"--hatch-max-width": `${maxWidth}px`,
		"--hatch-border-color": borderColor,
		"--hatch-shadow": shadow,
		"--hatch-bp-mobile": `${bpMobile}px`,
		"--hatch-bp-tablet": `${bpTablet}px`,
		"--hatch-bp-desktop": `${bpDesktop}px`
	};
	return Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join(" ");
}
/**
* Convert "Inter" + "Outfit" into the Google Fonts URL we preload.
* Falls back to Inter-only if both are the same.
*/
function designFontHref(design) {
	if (!design) return null;
	const fonts = /* @__PURE__ */ new Set();
	for (const f of [design.brand.font_heading, design.brand.font_body]) {
		const trimmed = (f || "").trim();
		if (trimmed && trimmed.toLowerCase() !== "system-ui") fonts.add(trimmed);
	}
	if (fonts.size === 0) return null;
	return `https://fonts.googleapis.com/css2?${Array.from(fonts).map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join("&")}&display=swap`;
}
//#endregion
//#region src/lib/cache.ts
function edgeCache(Astro, opts = {}) {
	if (opts.noCache) {
		Astro.response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
		return;
	}
	const ttl = opts.ttl ?? 60;
	const swr = opts.swr ?? 3600;
	Astro.response.headers.set("Cache-Control", `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${swr}`);
}
//#endregion
//#region src/lib/code-snippets.ts
/**
* Code Injection — head / body-start / body-end snippets for the Astro
* frontend. Reads from /hatch/v1/code-snippets (public endpoint).
*
* v0.50.31 — GA4, Plausible, Meta Pixel builders DELETED per the "Hatch
* ships only Google Tag Manager" rule. Users who want other tags add them
* inside their GTM container; users who need raw HTML inject via the WPCode
* plugin (auto-detected by Plugin Bridge). One way to do it, no zombie
* surface area.
*
* Head/body_start/body_end fields remain ONLY for SEO-plugin verification
* meta and raw HTML pasted by WP-side plugins (not by Hatch admin UI).
*/
var WP_API = WP_API_URL;
var EMPTY = {
	head: "",
	bodyStart: "",
	bodyEnd: ""
};
async function fetchSnippets() {
	if (!WP_API) return {};
	const base = WP_API.replace(/\/wp\/v2\/?$/, "");
	try {
		const res = await fetch(`${base}/hatch/v1/code-snippets`, {
			headers: { Accept: "application/json" },
			cf: { cacheTtl: 60 }
		});
		if (!res.ok) return {};
		return await res.json();
	} catch {
		return {};
	}
}
/** Google Tag Manager — the ONLY analytics integration Hatch ships. */
function buildGtmHead(id) {
	if (!id) return "";
	return `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');<\/script>`;
}
function buildGtmBodyStart(id) {
	if (!id) return "";
	return `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
}
/** Verification meta tags from the SEO plugin bridge — Google / Bing / etc. */
function buildVerificationMeta(items) {
	if (!items || items.length === 0) return "";
	const PROVIDER_NAME = {
		google: "google-site-verification",
		bing: "msvalidate.01",
		yandex: "yandex-verification",
		pinterest: "p:domain_verify",
		baidu: "baidu-site-verification"
	};
	return items.map((v) => {
		return `<meta name="${PROVIDER_NAME[v.provider] || v.provider}" content="${String(v.content).replace(/"/g, "&quot;")}" />`;
	}).join("\n");
}
async function fetchSeoMeta() {
	if (!WP_API) return {};
	const base = WP_API.replace(/\/wp\/v2\/?$/, "");
	try {
		const res = await fetch(`${base}/hatch/v1/seo-meta`, {
			headers: { Accept: "application/json" },
			cf: { cacheTtl: 300 }
		});
		if (!res.ok) return {};
		return await res.json();
	} catch {
		return {};
	}
}
/**
* Build all three slots. Called once per request from PageLayout.
*
* @returns { head, bodyStart, bodyEnd } — raw HTML strings ready for set:html.
*/
async function getCodeSnippets() {
	const [raw, seoMeta] = await Promise.all([fetchSnippets(), fetchSeoMeta()]);
	if (!raw && !seoMeta) return EMPTY;
	const gtmHead = buildGtmHead(raw.gtm_id || "");
	const gtmBody = buildGtmBodyStart(raw.gtm_id || "");
	return {
		head: [
			buildVerificationMeta(seoMeta?.verification),
			gtmHead,
			raw.head || ""
		].filter(Boolean).join("\n"),
		bodyStart: [gtmBody, raw.body_start || ""].filter(Boolean).join("\n"),
		bodyEnd: (raw.body_end || "").trim()
	};
}
//#endregion
//#region src/layouts/PageLayout.astro
createAstro("http://localhost:4321");
var $$PageLayout = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$PageLayout;
	const THEME_CSS_URL = {
		blog: theme_blog_default,
		tech: theme_tech_default,
		docs: theme_docs_default,
		astropaper: theme_astropaper_default,
		astrowind: theme_astrowind_default,
		astronano: theme_astronano_default
	};
	const { title, description = "", canonical = Astro.url.toString(), rawHead = "", ogImage = "", bare = false, cacheTtl } = Astro.props;
	const [features, primaryMenu, footerMenu, codeSnippets] = await Promise.all([
		getFeatures(),
		getMenus("primary"),
		getMenus("footer"),
		getCodeSnippets()
	]);
	const siteName = features.site.name || "Hatch";
	const siteDescription = features.site.description || "";
	const lang = (features.site.language || "en-US").split("-")[0];
	features.site.icon_url;
	const theme = features.theme || "blog";
	const designCssVars = designToCssVars(features.design);
	const designFonts = designFontHref(features.design);
	const colorMode = features.design?.brand?.mode || "auto";
	const usePageTransitions = features.aesthetic.animation.page_transitions;
	const perf = features.perf;
	const prefetchStrategy = perf.prefetch_enabled ? "prerender" : null;
	const fullTitle = title === siteName ? siteName : `${title} — ${siteName}`;
	const metaDescription = description || siteDescription;
	if (cacheTtl !== 0) edgeCache(Astro, {
		ttl: cacheTtl ?? 60,
		swr: 3600
	});
	return renderTemplate`<html${addAttribute(lang, "lang")}${addAttribute(theme, "data-hatch-theme")}${addAttribute(colorMode, "data-hatch-mode")}${addAttribute(designCssVars, "style")}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${rawHead ? renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": async ($$result) => renderTemplate`${unescapeHTML(rawHead)}` })}` : renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<title>${fullTitle}</title>${metaDescription && renderTemplate`<meta name="description"${addAttribute(metaDescription, "content")}>`}<link rel="canonical"${addAttribute(canonical, "href")}><meta name="robots" content="index, follow"><meta property="og:title"${addAttribute(title, "content")}><meta property="og:site_name"${addAttribute(siteName, "content")}>${metaDescription && renderTemplate`<meta property="og:description"${addAttribute(metaDescription, "content")}>`}<meta property="og:url"${addAttribute(canonical, "content")}><meta property="og:type" content="website">${ogImage && renderTemplate`<meta property="og:image"${addAttribute(ogImage, "content")}>`}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title"${addAttribute(title, "content")}>${metaDescription && renderTemplate`<meta name="twitter:description"${addAttribute(metaDescription, "content")}>`}${ogImage && renderTemplate`<meta name="twitter:image"${addAttribute(ogImage, "content")}>`}` })}`}<link rel="sitemap" href="/sitemap-index.xml"><link rel="stylesheet" href="/hatch-blocks.css"><link rel="alternate" type="application/rss+xml" href="/rss.xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>${theme === "astronano" && renderTemplate`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@400;500;600&display=swap">`}${theme === "astrowind" && renderTemplate`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap">`}${theme === "tech" && renderTemplate`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Inter:ital,opsz,wght@0,14..32,400..700;1,14..32,400..700&display=swap">`}${theme === "docs" && renderTemplate`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..700;1,14..32,300..700&display=swap">`}${(theme === "astropaper" || theme === "blog" || ![
		"astronano",
		"astrowind",
		"tech",
		"docs"
	].includes(theme)) && renderTemplate`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..700;1,14..32,300..700&display=swap">`}${designFonts && renderTemplate`<link rel="stylesheet"${addAttribute(designFonts, "href")}>`}<link rel="stylesheet"${addAttribute(THEME_CSS_URL[theme] || THEME_CSS_URL.blog, "href")}${addAttribute(theme, "data-hatch-theme-css")}>${usePageTransitions && renderTemplate`${renderComponent($$result, "ClientRouter", $$ClientRouter, {})}`}${prefetchStrategy && prefetchStrategy !== "prerender" && renderTemplate`<meta name="hatch-prefetch-strategy"${addAttribute(prefetchStrategy, "content")}>`}${prefetchStrategy === "prerender" && !usePageTransitions && renderTemplate`<script type="speculationrules">${unescapeHTML(JSON.stringify({ prerender: [{
		source: "document",
		where: { and: [
			{ href_matches: "/*" },
			{ not: { href_matches: "/wp-admin/*" } },
			{ not: { href_matches: "/api/*" } }
		] },
		eagerness: "moderate"
	}] }))}<\/script>`}${perf.partytown && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<script>{\`window.partytown = { forward: ['dataLayer.push', 'gtag'], lib: '/~partytown/' };\`}<\/script><script type="text/partytown" src="https://cdn.jsdelivr.net/npm/@builder.io/partytown@0.10.2/lib/partytown.js"><\/script>` })}`}${perf.telemetry && renderTemplate`<script>(function(){${defineScriptVars({ siteUrl: features.site.url })}
        addEventListener('load', function () {
          try {
            var nav = performance.getEntriesByType('navigation')[0];
            if (!nav) return;
            new PerformanceObserver(function (list) {
              var lcp = list.getEntries().at(-1);
              if (!lcp) return;
              var body = JSON.stringify({
                site: siteUrl,
                ttfb: Math.round(nav.responseStart),
                lcp:  Math.round(lcp.startTime),
                dcl:  Math.round(nav.domContentLoadedEventEnd),
                ts:   Date.now()
              });
              navigator.sendBeacon('/api/telemetry', body);
            }).observe({ type: 'largest-contentful-paint', buffered: true });
          } catch (e) {}
        });
      })();<\/script>`}${features.aesthetic.animation.respect_reduced_motion && renderTemplate`<style>
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; }
        }
      </style>`}<style>
      [data-hatch-theme] body { font-family: var(--hatch-font-body, "Inter"), ui-sans-serif, system-ui, sans-serif; }
      [data-hatch-theme] h1, [data-hatch-theme] h2, [data-hatch-theme] h3, [data-hatch-theme] h4 {
        font-family: var(--hatch-font-heading, "Inter"), ui-sans-serif, system-ui, sans-serif;
      }
      /* v0.50.17 — Density visually scales outer page padding so the picker
         actually changes the rhythm of every page. Tailwind padding classes
         on individual containers still win on the inside; this is the global
         stretch/compression knob. */
      [data-hatch-theme] main > * { line-height: calc(1.5 + (var(--hatch-density, 1) - 1) * 0.25); }
      [data-hatch-theme] main.hatch-density-spacious { padding-block: 1.5rem; }
      [data-hatch-theme] article { padding-block: calc(2.5rem * var(--hatch-density, 1)) !important; }
    </style>${codeSnippets.head && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": async ($$result) => renderTemplate`${unescapeHTML(codeSnippets.head)}` })}`}${renderHead($$result)}</head><body class="antialiased font-sans bg-hatch-bg text-hatch-fg flex flex-col min-h-screen">${codeSnippets.bodyStart && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": async ($$result) => renderTemplate`${unescapeHTML(codeSnippets.bodyStart)}` })}`}${!bare && renderTemplate`${renderComponent($$result, "SiteHeader", $$SiteHeader, {
		"features": features,
		"menuItems": primaryMenu
	})}`}<div class="flex-1">${renderSlot($$result, $$slots["default"])}</div>${!bare && renderTemplate`${renderComponent($$result, "SiteFooter", $$SiteFooter, {
		"features": features,
		"menuItems": footerMenu
	})}`}${codeSnippets.bodyEnd && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": async ($$result) => renderTemplate`${unescapeHTML(codeSnippets.bodyEnd)}` })}`}<script>(function(){${defineScriptVars({ wpBase: (features.site?.url || "").replace(/\/$/, "") })}
      window.HATCH_WP_BASE = wpBase;
    })();<\/script><script src="/hatch-blocks.js"><\/script></body></html>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/layouts/PageLayout.astro", void 0);
//#endregion
export { $$PageLayout as t };
