globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, _ as addAttribute, a as Fragment, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { n as getFeatures } from "./features_Ccz4SEbt.mjs";
import { t as $$HatchImage } from "./HatchImage_DRsoC0bt.mjs";
//#region src/components/PostCard.astro
createAstro("http://localhost:4321");
var $$PostCard = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$PostCard;
	const { post, variant = "default", showExcerpt = true, headingLevel = 3 } = Astro.props;
	const Title = `h${headingLevel}`;
	const authorName = post.author?.name?.trim() || "";
	const features = await getFeatures();
	const href = `/blog/${post.slug}`;
	const aes = features.aesthetic;
	const hoverClass = aes.images.hover_zoom ? "group-hover:scale-[1.02] transition-transform duration-500" : "";
	const showFallback = aes.images.fallback_gradient;
	const showRtPill = aes.reading.reading_time_label !== "hidden";
	const rtText = (m) => aes.reading.reading_time_label === "mins" ? `${m} mins` : `${m} min read`;
	const ratioClass = aes.images.aspect_ratio === "3_1" ? "aspect-[3/1]" : aes.images.aspect_ratio === "16_9" ? "aspect-[16/9]" : "aspect-[2/1]";
	const dateLabel = (() => {
		const d = new Date(post.publishedAt);
		if (aes.reading.date_format === "short") return d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
		if (aes.reading.date_format === "relative") {
			const diff = Math.floor((Date.now() - d.getTime()) / 864e5);
			if (diff === 0) return "Today";
			if (diff === 1) return "Yesterday";
			if (diff < 7) return `${diff} ${diff === 1 ? "day" : "days"} ago`;
			if (diff < 30) {
				const w = Math.floor(diff / 7);
				return `${w} ${w === 1 ? "week" : "weeks"} ago`;
			}
			if (diff < 365) {
				const m = Math.floor(diff / 30);
				return `${m} ${m === 1 ? "month" : "months"} ago`;
			}
			const y = Math.floor(diff / 365);
			return `${y} ${y === 1 ? "year" : "years"} ago`;
		}
		return d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric"
		});
	})();
	return renderTemplate`${variant === "feature" ? renderTemplate`${maybeRenderHead($$result)}<a${addAttribute(href, "href")} class="group block rounded-xl overflow-hidden border border-hatch-border hover:border-hatch-border-2 transition-colors">${post.featuredImage ? renderTemplate`<div${addAttribute(`${ratioClass} overflow-hidden bg-hatch-bg-3`, "class")}>${renderComponent($$result, "HatchImage", $$HatchImage, {
		"features": features,
		"src": post.featuredImage,
		"alt": post.featuredImageAlt || "",
		"width": 1200,
		"height": 600,
		"loading": "eager",
		"fetchpriority": "high",
		"class": `w-full h-full object-cover ${hoverClass}`
	})}</div>` : showFallback ? renderTemplate`<div${addAttribute(`${ratioClass} hatch-card-placeholder`, "class")}></div>` : null}<div class="p-6 sm:p-8">${post.category && renderTemplate`<span class="inline-block text-[11px] uppercase tracking-wider font-medium text-hatch-primary mb-3">${post.category}</span>`}<h2 class="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight group-hover:text-hatch-primary transition-colors">${post.title}</h2>${showExcerpt && post.excerpt && renderTemplate`<p class="mt-3 text-hatch-fg-muted line-clamp-2">${post.excerpt}</p>`}<div class="mt-5 flex items-center gap-3 text-[13px] text-hatch-fg-subtle">${authorName && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<span>${authorName}</span><span aria-hidden="true">·</span>` })}`}<time${addAttribute(post.publishedAt, "datetime")}>${dateLabel}</time>${showRtPill && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<span aria-hidden="true">·</span><span>${rtText(post.readMinutes)}</span>` })}`}</div></div></a>` : variant === "compact" ? renderTemplate`<a${addAttribute(href, "href")} class="group flex gap-3 py-3 border-b border-hatch-border last:border-b-0">${post.featuredImage && renderTemplate`<div class="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-hatch-bg-3">${renderComponent($$result, "HatchImage", $$HatchImage, {
		"features": features,
		"src": post.featuredImage,
		"alt": "",
		"width": 128,
		"height": 128,
		"class": "w-full h-full object-cover"
	})}</div>`}<div class="flex-1 min-w-0"><h3 class="text-[14px] font-medium leading-snug line-clamp-2 group-hover:text-hatch-primary transition-colors">${post.title}</h3><div class="mt-1 text-[13px] text-hatch-fg-subtle"><time${addAttribute(post.publishedAt, "datetime")}>${dateLabel}</time>${showRtPill && post.readMinutes > 0 && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` · ${rtText(post.readMinutes)}` })}`}</div></div></a>` : renderTemplate`<a${addAttribute(href, "href")} class="post-card hatch-post-card group flex flex-col h-full"><div class="hatch-post-card-media aspect-[16/10] overflow-hidden rounded-lg bg-hatch-bg-3 mb-4">${post.featuredImage ? renderTemplate`${renderComponent($$result, "HatchImage", $$HatchImage, {
		"features": features,
		"src": post.featuredImage,
		"alt": post.featuredImageAlt || "",
		"width": 800,
		"height": 500,
		"class": `w-full h-full object-cover ${hoverClass}`
	})}` : showFallback ? renderTemplate`<div class="w-full h-full hatch-card-placeholder"></div>` : null}</div>${post.category && renderTemplate`<span class="hatch-post-card-eyebrow inline-block self-start text-[11px] uppercase tracking-wider font-medium text-hatch-primary mb-2">${post.category}</span>`}${renderComponent($$result, "Title", Title, { "class": "hatch-post-card-title text-lg font-semibold leading-snug tracking-tight group-hover:text-hatch-primary transition-colors line-clamp-2" }, { "default": ($$result) => renderTemplate`${post.title}` })}${showExcerpt && post.excerpt && renderTemplate`<p class="hatch-post-card-excerpt mt-2 text-[14px] text-hatch-fg-muted line-clamp-2 leading-relaxed">${post.excerpt}</p>`}<div class="hatch-post-card-meta mt-auto pt-3 flex items-center gap-2 text-[13px] text-hatch-fg-subtle">${authorName && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<span>${authorName}</span><span aria-hidden="true">·</span>` })}`}<time${addAttribute(post.publishedAt, "datetime")}>${dateLabel}</time>${showRtPill && post.readMinutes > 0 && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<span aria-hidden="true">·</span><span>${rtText(post.readMinutes)}</span>` })}`}</div></a>`}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/PostCard.astro", void 0);
//#endregion
export { $$PostCard as t };
