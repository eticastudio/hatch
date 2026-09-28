globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import { n as getFeatures } from "./features_Ccz4SEbt.mjs";
//#region src/pages/register.astro
var register_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Register,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$Register = createComponent(async ($$result, $$props, $$slots) => {
	const Astro2 = $$result.createAstro($$props, $$slots);
	Astro2.self = $$Register;
	const features = await getFeatures();
	const redirectTo = new URL(Astro2.request.url).searchParams.get("redirect_to") || "/account";
	const SITE = features.site.url || "https://hatch-site.invalid";
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": "Create an account",
		"description": "Sign up for an account.",
		"canonical": `${SITE}/register`
	}, { "default": async ($$result2) => renderTemplate`${maybeRenderHead($$result2)}<main class="mx-auto px-5 sm:px-8 py-16 sm:py-20" style="max-width: 440px"><header class="mb-8"><h1 class="text-3xl font-semibold tracking-tight">Create an account</h1><p class="mt-2 text-[14px] text-hatch-fg-muted">Already registered? <a${addAttribute(`/login?redirect_to=${encodeURIComponent(redirectTo)}`, "href")} class="text-hatch-primary hover:underline">Sign in</a>.</p></header><form id="hatch-register-form" class="flex flex-col gap-4" method="POST" action="/api/auth/register"${addAttribute(redirectTo, "data-redirect")}><label class="flex flex-col gap-1.5"><span class="text-[12.5px] font-medium text-hatch-fg-muted">Username</span><input type="text" name="username" required minlength="3" autocomplete="username" class="px-3 py-2 rounded-md border border-hatch-border bg-hatch-bg focus:border-hatch-primary focus:ring-2 focus:ring-hatch-primary/15 outline-none text-[14px]"></label><label class="flex flex-col gap-1.5"><span class="text-[12.5px] font-medium text-hatch-fg-muted">Email</span><input type="email" name="email" required autocomplete="email" class="px-3 py-2 rounded-md border border-hatch-border bg-hatch-bg focus:border-hatch-primary focus:ring-2 focus:ring-hatch-primary/15 outline-none text-[14px]"></label><label class="flex flex-col gap-1.5"><span class="text-[12.5px] font-medium text-hatch-fg-muted">Password (min 8 chars)</span><input type="password" name="password" required minlength="8" autocomplete="new-password" class="px-3 py-2 rounded-md border border-hatch-border bg-hatch-bg focus:border-hatch-primary focus:ring-2 focus:ring-hatch-primary/15 outline-none text-[14px]"></label><div aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none"><label>Website <input type="text" name="hp_website" tabindex="-1" autocomplete="off"></label></div><div class="flex items-center gap-3"><button type="submit" class="px-5 py-2.5 rounded-md bg-hatch-primary text-hatch-primary-fg text-[13.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">Create account</button><p id="hatch-register-status" class="text-[13px] text-hatch-fg-subtle" aria-live="polite"></p></div></form><script>
      (function () {
        const form = document.getElementById('hatch-register-form');
        if (!form) return;
        const status = document.getElementById('hatch-register-status');
        const redirect = form.dataset.redirect || '/account';
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const data = new FormData(form);
          const btn = form.querySelector('button[type="submit"]');
          if (btn) btn.disabled = true;
          if (status) { status.textContent = 'Creating account...'; status.className = 'text-[13px] text-hatch-fg-subtle'; }
          try {
            const payload = {
              username: String(data.get('username') || ''),
              email: String(data.get('email') || ''),
              password: String(data.get('password') || ''),
              hp_website: String(data.get('hp_website') || ''),
            };
            const res = await fetch(form.action, {
              method: 'POST',
              body: JSON.stringify(payload),
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              credentials: 'include',
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.message || 'Registration failed');
            if (status) { status.textContent = 'Account created. Redirecting...'; status.className = 'text-[13px] text-green-600 dark:text-green-400'; }
            window.location.href = redirect;
          } catch (err) {
            if (status) { status.textContent = (err && err.message) || 'Registration failed'; status.className = 'text-[13px] text-red-600 dark:text-red-400'; }
            if (btn) btn.disabled = false;
          }
        });
      })();
    <\/script></main>` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/register.astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/register.astro";
var $$url = "/register";
//#endregion
//#region \0virtual:astro:page:src/pages/register@_@astro
var page = () => register_exports;
//#endregion
export { page };
