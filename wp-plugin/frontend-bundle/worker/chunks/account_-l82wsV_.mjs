globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import "./server_BKSwzYCg.mjs";
import { n as getFeatures } from "./features_Ccz4SEbt.mjs";
//#region src/pages/account.astro
var account_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Account,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$Account = createComponent(async ($$result, $$props, $$slots) => {
	const Astro2 = $$result.createAstro($$props, $$slots);
	Astro2.self = $$Account;
	const SITE = (await getFeatures()).site.url || "https://hatch-site.invalid";
	const WP_BASE = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp\/v2\/?$/, "").replace(/\/$/, "");
	const cookieHeader = Astro2.request.headers.get("cookie") || "";
	let user = null;
	if (WP_BASE && cookieHeader.includes("hatch_jwt=")) try {
		const res = await fetch(`${WP_BASE}/hatch/v1/auth/me`, {
			headers: {
				Accept: "application/json",
				Cookie: cookieHeader
			},
			signal: AbortSignal.timeout(1e4)
		});
		if (res.ok) {
			const body = await res.json();
			if (body && body.user) user = body.user;
		}
	} catch {}
	if (!user) return Astro2.redirect(`/login?redirect_to=${encodeURIComponent("/account")}`, 302);
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": "Account",
		"description": "Your account.",
		"canonical": `${SITE}/account`
	}, { "default": async ($$result2) => renderTemplate`${maybeRenderHead($$result2)}<main class="mx-auto px-5 sm:px-8 py-16 sm:py-20" style="max-width: 560px"><header class="mb-8 flex items-center gap-4"><img${addAttribute(user.avatar, "src")} alt="" width="64" height="64" class="rounded-full flex-shrink-0" loading="lazy"><div class="min-w-0"><h1 class="text-2xl sm:text-3xl font-semibold tracking-tight truncate">${user.name}</h1><p class="mt-1 text-[13.5px] text-hatch-fg-muted truncate">${user.email}</p></div></header><section class="border border-hatch-border rounded-md p-5 bg-hatch-bg-2 mb-6"><h2 class="text-[13px] font-medium text-hatch-fg-muted uppercase tracking-wider mb-3">Roles</h2><ul class="flex flex-wrap gap-2">${user.roles.length === 0 && renderTemplate`<li class="text-[13px] text-hatch-fg-subtle">No roles assigned.</li>`}${user.roles.map((r) => renderTemplate`<li class="text-[12px] px-2 py-1 rounded border border-hatch-border bg-hatch-bg font-mono">${r}</li>`)}</ul></section><form id="hatch-logout-form" method="POST" action="/api/auth/logout"><button type="submit" class="px-5 py-2.5 rounded-md border border-hatch-border bg-hatch-bg text-[13.5px] font-medium hover:bg-hatch-bg-2 transition-colors">Sign out</button></form><script>
      (function () {
        const form = document.getElementById('hatch-logout-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = form.querySelector('button[type="submit"]');
          if (btn) btn.disabled = true;
          try {
            await fetch(form.action, { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' } });
          } catch { /* ignore, still redirect */ }
          window.location.href = '/';
        });
      })();
    <\/script></main>` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/account.astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/account.astro";
var $$url = "/account";
//#endregion
//#region \0virtual:astro:page:src/pages/account@_@astro
var page = () => account_exports;
//#endregion
export { page };
