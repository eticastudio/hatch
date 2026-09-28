globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import { n as getFeatures } from "./features_Ccz4SEbt.mjs";
//#region src/pages/login.astro
var login_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Login,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$Login = createComponent(async ($$result, $$props, $$slots) => {
	const Astro2 = $$result.createAstro($$props, $$slots);
	Astro2.self = $$Login;
	const features = await getFeatures();
	const redirectTo = new URL(Astro2.request.url).searchParams.get("redirect_to") || "/account";
	const SITE = features.site.url || "https://hatch-site.invalid";
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": "Sign in",
		"description": "Sign in to your account.",
		"canonical": `${SITE}/login`
	}, { "default": async ($$result2) => renderTemplate`${maybeRenderHead($$result2)}<main class="mx-auto px-5 sm:px-8 py-16 sm:py-20" style="max-width: 440px"><header class="mb-8"><h1 class="text-3xl font-semibold tracking-tight">Sign in</h1><p class="mt-2 text-[14px] text-hatch-fg-muted">No account? <a${addAttribute(`/register?redirect_to=${encodeURIComponent(redirectTo)}`, "href")} class="text-hatch-primary hover:underline">Create one</a>.</p></header><div id="hatch-login-error" class="hatch-login__error" role="alert" hidden style="margin-bottom:1rem;padding:0.75rem 1rem;border-radius:6px;border:1px solid #f5c2c7;background:#fff5f6;color:#842029;font-size:13.5px;line-height:1.4;"></div><form id="hatch-login-form" class="flex flex-col gap-4" method="POST" action="/api/auth/login"${addAttribute(redirectTo, "data-redirect")}><label class="flex flex-col gap-1.5"><span class="text-[12.5px] font-medium text-hatch-fg-muted">Username or email</span><input type="text" name="username" required autocomplete="username" class="px-3 py-2 rounded-md border border-hatch-border bg-hatch-bg focus:border-hatch-primary focus:ring-2 focus:ring-hatch-primary/15 outline-none text-[14px]"></label><label class="flex flex-col gap-1.5"><span class="text-[12.5px] font-medium text-hatch-fg-muted">Password</span><input type="password" name="password" required minlength="8" autocomplete="current-password" class="px-3 py-2 rounded-md border border-hatch-border bg-hatch-bg focus:border-hatch-primary focus:ring-2 focus:ring-hatch-primary/15 outline-none text-[14px]"></label><div class="flex items-center gap-3"><button type="submit" class="px-5 py-2.5 rounded-md bg-hatch-primary text-hatch-primary-fg text-[13.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">Sign in</button><p id="hatch-login-status" class="text-[13px] text-hatch-fg-subtle" aria-live="polite"></p></div></form><script>
      (function () {
        const form = document.getElementById('hatch-login-form');
        if (!form) return;
        const status = document.getElementById('hatch-login-status');
        const errorBanner = document.getElementById('hatch-login-error');
        const redirect = form.dataset.redirect || '/account';
        const showError = (msg) => {
          if (!errorBanner) return;
          errorBanner.textContent = msg;
          errorBanner.hidden = false;
        };
        const clearError = () => {
          if (!errorBanner) return;
          errorBanner.textContent = '';
          errorBanner.hidden = true;
        };
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          clearError();
          const data = new FormData(form);
          const btn = form.querySelector('button[type="submit"]');
          if (btn) btn.disabled = true;
          if (status) { status.textContent = 'Signing in.'; status.className = 'text-[13px] text-hatch-fg-subtle'; }
          try {
            const res = await fetch(form.action, {
              method: 'POST',
              body: JSON.stringify({
                username: String(data.get('username') || ''),
                password: String(data.get('password') || ''),
              }),
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              credentials: 'include',
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              const msg = (body && body.message)
                ? body.message
                : (res.status === 401
                    ? 'Incorrect username or password. Please try again.'
                    : 'Sign-in failed. Please try again.');
              throw new Error(msg);
            }
            if (status) { status.textContent = 'Signed in. Redirecting.'; status.className = 'text-[13px] text-green-600 dark:text-green-400'; }
            window.location.href = redirect;
          } catch (err) {
            const msg = (err && err.message) || 'Sign-in failed. Please try again.';
            showError(msg);
            if (status) { status.textContent = ''; }
            if (btn) btn.disabled = false;
          }
        });
      })();
    <\/script></main>` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/login.astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/login.astro";
var $$url = "/login";
//#endregion
//#region \0virtual:astro:page:src/pages/login@_@astro
var page = () => login_exports;
//#endregion
export { page };
