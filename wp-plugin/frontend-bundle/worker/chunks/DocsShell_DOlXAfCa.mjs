globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, c as renderSlot, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as themeKey } from "./theme-dispatch_Bj-ZHGQx.mjs";
import { t as $$DocsSidebar } from "./DocsSidebar_Dec9QxxJ.mjs";
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
}, "/private/var/folders/k3/_ljrcwl15lx5cd5ndyy5n6lh0000gn/T/hatch-bundle.Jucsvy/astro/src/components/theme/DocsShell.astro", void 0);
//#endregion
export { $$DocsShell as t };
