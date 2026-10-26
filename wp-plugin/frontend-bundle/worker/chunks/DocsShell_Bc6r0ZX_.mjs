globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, c as renderSlot, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as themeKey } from "./theme-dispatch_CIFDBQFJ.mjs";
import { t as $$DocsSidebar } from "./DocsSidebar_DS680iTY.mjs";
//#region src/components/theme/DocsShell.astro
createAstro("https://hatch-site.invalid");
var $$DocsShell = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$DocsShell;
	const { features, activeCategorySlug = null } = Astro.props;
	const isDocs = themeKey(features) === "docs";
	return renderTemplate`${isDocs ? renderTemplate`${maybeRenderHead($$result)}<div class="hatch-docs-shell" data-hatch-docs-shell data-astro-cid-kwomucim>${renderComponent($$result, "DocsSidebar", $$DocsSidebar, {
		"activeCategorySlug": activeCategorySlug,
		"data-astro-cid-kwomucim": true
	})}<div class="hatch-docs-shell__main" data-astro-cid-kwomucim>${renderSlot($$result, $$slots["default"])}</div></div>` : renderTemplate`${renderSlot($$result, $$slots["default"])}`}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.MDsQ3N/astro/src/components/theme/DocsShell.astro", void 0);
//#endregion
export { $$DocsShell as t };
