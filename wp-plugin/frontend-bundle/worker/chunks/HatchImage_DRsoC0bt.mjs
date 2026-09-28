globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, _ as addAttribute, d as renderTemplate, h as maybeRenderHead } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { i as imgSrc } from "./features_Ccz4SEbt.mjs";
//#region src/components/HatchImage.astro
createAstro("http://localhost:4321");
var $$HatchImage = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$HatchImage;
	const { features = null, src, alt = "", width, height, format = "webp", quality, loading = "lazy", fetchpriority, decoding = "async", class: className, style, retina = 2 } = Astro.props;
	if (!src) return null;
	const opts = {
		w: width,
		h: height,
		format,
		q: quality
	};
	const optimized = features ? imgSrc(features, src, opts) : src;
	const optimized2x = features && width ? imgSrc(features, src, {
		...opts,
		w: width * retina,
		h: height ? height * retina : void 0
	}) : optimized;
	const onerror = optimized !== src ? `this.onerror=null;this.removeAttribute('srcset');this.src=${JSON.stringify(src)}` : void 0;
	const srcset = width && optimized !== optimized2x ? `${optimized} 1x, ${optimized2x} ${retina}x` : void 0;
	return renderTemplate`${maybeRenderHead($$result)}<img${addAttribute(optimized, "src")}${addAttribute(srcset, "srcset")}${addAttribute(alt, "alt")}${addAttribute(width, "width")}${addAttribute(height, "height")}${addAttribute(loading, "loading")}${addAttribute(fetchpriority, "fetchpriority")}${addAttribute(decoding, "decoding")}${addAttribute(className, "class")}${addAttribute(style, "style")}${addAttribute(onerror, "onerror")}>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/HatchImage.astro", void 0);
//#endregion
export { $$HatchImage as t };
