globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, _ as addAttribute, a as Fragment, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { s as cleanSiteText } from "./features_DrcP03_V.mjs";
//#region src/components/theme/Breadcrumb.astro
createAstro("https://hatch-site.invalid");
var $$Breadcrumb = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Breadcrumb;
	const { items, sep = "/", variant = "default", class: extra = "" } = Astro.props;
	const crumbs = items.map((c) => ({
		...c,
		label: cleanSiteText(c.label)
	})).filter((c) => c.label !== "");
	const lastIndex = crumbs.length - 1;
	return renderTemplate`${maybeRenderHead($$result)}<nav aria-label="Breadcrumb"${addAttribute([
		"hatch-crumbs",
		variant === "mono" && "hatch-crumbs--mono",
		extra
	], "class:list")} data-astro-cid-q4g25rac><ol data-astro-cid-q4g25rac>${crumbs.map((c, i) => renderTemplate`<li${addAttribute(i === lastIndex ? "hatch-crumbs__current" : void 0, "class")} data-astro-cid-q4g25rac>${i === lastIndex ? renderTemplate`<span aria-current="page"${addAttribute(c.label, "title")} data-astro-cid-q4g25rac>${c.label}</span>` : renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`${c.href ? renderTemplate`<a${addAttribute(c.href, "href")}${addAttribute(c.ariaLabel, "aria-label")} data-astro-cid-q4g25rac>${c.label}</a>` : renderTemplate`<span data-astro-cid-q4g25rac>${c.label}</span>`}<span class="hatch-crumbs__sep" aria-hidden="true" data-astro-cid-q4g25rac>${sep}</span>` })}`}</li>`)}</ol></nav>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.MDsQ3N/astro/src/components/theme/Breadcrumb.astro", void 0);
//#endregion
export { $$Breadcrumb as t };
