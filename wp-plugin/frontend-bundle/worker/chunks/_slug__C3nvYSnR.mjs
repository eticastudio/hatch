globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, T as unescapeHTML, _ as addAttribute, a as Fragment, c as renderSlot, d as renderTemplate, h as maybeRenderHead, i as renderComponent, v as defineScriptVars } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import { i as WP_API_USER, n as WP_API_PASS } from "./server_BKSwzYCg.mjs";
import { n as $$Image$1 } from "./_astro_assets_DO3rG9uo.mjs";
import { a as rewriteContentImages, n as getFeatures, r as hasFeature } from "./features_Ccz4SEbt.mjs";
import { d as getSchema, f as getSeoHead, s as getPostBySlug, t as getAdjacent, u as getRelatedPosts } from "./hatch_it4n8Llv.mjs";
import { t as themeKey } from "./theme-dispatch_CIFDBQFJ.mjs";
import { t as $$HatchImage } from "./HatchImage_DRsoC0bt.mjs";
import { t as $$PostCard } from "./PostCard_BFV0Oqvs.mjs";
import { t as $$DocsSidebar } from "./DocsSidebar_B0JRCk4v.mjs";
//#region src/components/HatchComments.astro
createAstro("http://localhost:4321");
var $$HatchComments = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$HatchComments;
	const { features, postId, postTitle = "this post" } = Astro.props;
	const base = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp\/v2\/?$/, "");
	const integ = features.integrations;
	const enabled = !!integ?.comments?.enabled;
	const turnstileOn = !!(integ?.comments?.turnstile && integ?.turnstile?.enabled && integ?.turnstile?.site_key);
	const siteKey = integ?.turnstile?.site_key || "";
	let comments = [];
	let count = 0;
	if (enabled && base) try {
		const res = await fetch(`${base}/hatch/v1/comments?post=${postId}`, { cache: "no-store" });
		if (res.ok) {
			const data = await res.json();
			comments = Array.isArray(data.comments) ? data.comments : [];
			count = comments.length;
		}
	} catch {}
	const submitUrl = "/api/hatch-comments/post";
	const fmt = (iso) => new Date(iso).toLocaleDateString(features.site.language || "en-US", {
		month: "short",
		day: "numeric",
		year: "numeric"
	});
	return renderTemplate`${enabled && renderTemplate`${maybeRenderHead($$result)}<section class="hatch-comments mt-16 pt-8 border-t border-hatch-border" id="comments" data-astro-cid-3pseg426><header class="flex items-baseline justify-between mb-6 gap-4 flex-wrap" data-astro-cid-3pseg426><h2 class="text-[20px] sm:text-[22px] font-semibold tracking-tight" data-astro-cid-3pseg426>${count === 0 ? "No comments yet" : count === 1 ? "1 Comment" : `${count} Comments`}</h2>${count === 0 && renderTemplate`<p class="hatch-comments__empty text-[13.5px] text-hatch-fg-muted" data-astro-cid-3pseg426>Be the first to comment.</p>`}<a href="#reply" class="text-[12.5px] text-hatch-primary hover:underline whitespace-nowrap" data-astro-cid-3pseg426>Write a comment</a></header>${comments.length > 0 && renderTemplate`<ul class="flex flex-col gap-5 mb-10" data-hatch-comment-list data-astro-cid-3pseg426>${comments.map((c) => renderTemplate`<li class="flex gap-3 items-start" data-astro-cid-3pseg426><img${addAttribute(c.avatar, "src")} alt="" width="36" height="36" class="rounded-full flex-shrink-0 mt-0.5" loading="lazy" data-astro-cid-3pseg426><div class="flex-1 min-w-0" data-astro-cid-3pseg426><div class="flex items-baseline gap-2 flex-wrap" data-astro-cid-3pseg426><span class="font-semibold text-[13.5px] text-hatch-fg" data-astro-cid-3pseg426>${c.author}</span>${c.is_author && renderTemplate`<span class="text-[9.5px] uppercase tracking-wider font-medium text-hatch-primary border border-hatch-primary/40 rounded px-1.5 py-0.5" data-astro-cid-3pseg426>Author</span>`}<span class="text-[11.5px] text-hatch-fg-subtle" data-astro-cid-3pseg426>${fmt(c.date_gmt)}</span></div><div class="mt-1 text-[14px] leading-[1.65] text-hatch-fg-muted hatch-comment-body" data-astro-cid-3pseg426>${unescapeHTML(c.content)}</div></div></li>`)}</ul>`}${comments.length === 0 && renderTemplate`<ul class="flex flex-col gap-5 mb-10 hidden" data-hatch-comment-list data-astro-cid-3pseg426></ul>`}<form id="hatch-comment-form"${addAttribute(submitUrl, "action")} method="POST" class="flex flex-col gap-3.5"${addAttribute(String(postId), "data-postid")}${addAttribute(submitUrl, "data-endpoint")} novalidate data-astro-cid-3pseg426><h3 id="reply" class="text-[15px] font-semibold mb-1" data-astro-cid-3pseg426>Leave a comment</h3><input type="hidden" name="post"${addAttribute(String(postId), "value")} data-astro-cid-3pseg426><input type="hidden" name="post_id"${addAttribute(String(postId), "value")} data-astro-cid-3pseg426><div class="hatch-hp" aria-hidden="true" data-astro-cid-3pseg426><label data-astro-cid-3pseg426>Leave this field empty<input type="text" name="hatch_hp" tabindex="-1" autocomplete="off" value="" data-astro-cid-3pseg426></label></div><div class="grid sm:grid-cols-2 gap-3" data-astro-cid-3pseg426><label class="flex flex-col gap-1.5" data-astro-cid-3pseg426><span class="text-[12.5px] font-medium text-hatch-fg-muted" data-astro-cid-3pseg426>Name</span><input type="text" name="author" required minlength="1" data-hatch-field="author" class="px-3 py-2 rounded-md border border-hatch-border bg-hatch-bg focus:border-hatch-primary focus:ring-2 focus:ring-hatch-primary/15 outline-none text-[14px]" autocomplete="name" data-astro-cid-3pseg426><p class="text-[12px] text-red-600 dark:text-red-400 hidden" data-hatch-field-error="author" data-astro-cid-3pseg426></p></label><label class="flex flex-col gap-1.5" data-astro-cid-3pseg426><span class="text-[12.5px] font-medium text-hatch-fg-muted" data-astro-cid-3pseg426>Email <span class="text-hatch-fg-subtle" data-astro-cid-3pseg426>(never shown)</span></span><input type="email" name="email" required data-hatch-field="email" class="px-3 py-2 rounded-md border border-hatch-border bg-hatch-bg focus:border-hatch-primary focus:ring-2 focus:ring-hatch-primary/15 outline-none text-[14px]" autocomplete="email" data-astro-cid-3pseg426><p class="text-[12px] text-red-600 dark:text-red-400 hidden" data-hatch-field-error="email" data-astro-cid-3pseg426></p></label></div><label class="flex flex-col gap-1.5" data-astro-cid-3pseg426><span class="text-[12.5px] font-medium text-hatch-fg-muted" data-astro-cid-3pseg426>Comment</span><textarea name="content" rows="5" required minlength="3" data-hatch-field="content" class="px-3 py-2 rounded-md border border-hatch-border bg-hatch-bg focus:border-hatch-primary focus:ring-2 focus:ring-hatch-primary/15 outline-none text-[14px] resize-y font-sans" data-astro-cid-3pseg426></textarea><p class="text-[12px] text-red-600 dark:text-red-400 hidden" data-hatch-field-error="content" data-astro-cid-3pseg426></p></label>${turnstileOn && renderTemplate`<div class="cf-turnstile"${addAttribute(siteKey, "data-sitekey")} data-theme="auto" data-astro-cid-3pseg426></div>`}<div class="flex items-center gap-3" data-astro-cid-3pseg426><button type="submit" class="px-5 py-2.5 rounded-md bg-hatch-primary text-hatch-primary-fg text-[13.5px] font-medium hover:bg-hatch-primary/90 transition-colors disabled:opacity-50" data-astro-cid-3pseg426>Post comment</button><p id="hatch-comment-status" class="text-[13px] text-hatch-fg-subtle" aria-live="polite" data-hatch-form-status data-astro-cid-3pseg426></p></div></form>${turnstileOn && renderTemplate`<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer><\/script>`}<script data-hatch-comments-script>
      (function () {
        const form = document.getElementById('hatch-comment-form');
        if (!form) return;
        const status = form.querySelector('[data-hatch-form-status]');
        const list   = document.querySelector('[data-hatch-comment-list]');
        function clearErrors() {
          form.querySelectorAll('[data-hatch-field-error]').forEach(function (n) {
            n.textContent = '';
            n.classList.add('hidden');
          });
        }
        function paintFieldErrors(map) {
          Object.keys(map || {}).forEach(function (name) {
            const el = form.querySelector('[data-hatch-field-error="' + name + '"]');
            if (el) {
              el.textContent = map[name];
              el.classList.remove('hidden');
            }
          });
        }
        function esc(s) {
          return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
          });
        }
        function appendComment(author, content) {
          if (!list) return;
          list.classList.remove('hidden');
          const li = document.createElement('li');
          li.className = 'flex gap-3 items-start';
          li.innerHTML =
            '<div class="w-9 h-9 rounded-full bg-hatch-bg-2 border border-hatch-border flex-shrink-0 mt-0.5"></div>' +
            '<div class="flex-1 min-w-0">' +
              '<div class="flex items-baseline gap-2 flex-wrap">' +
                '<span class="font-semibold text-[13.5px] text-hatch-fg">' + esc(author) + '</span>' +
                '<span class="text-[11.5px] text-hatch-fg-subtle">just now</span>' +
              '</div>' +
              '<div class="mt-1 text-[14px] leading-[1.65] text-hatch-fg-muted hatch-comment-body"><p>' + esc(content) + '</p></div>' +
            '</div>';
          list.appendChild(li);
        }
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          clearErrors();
          const data = new FormData(form);
          const author  = String(data.get('author') || '').trim();
          const content = String(data.get('content') || '').trim();
          if (content.length < 3) {
            paintFieldErrors({ content: 'Please write a longer comment.' });
            return;
          }
          const tsResp = document.querySelector('[name="cf-turnstile-response"]');
          if (tsResp && tsResp.value) data.append('cf-turnstile-response', tsResp.value);
          const submitBtn = form.querySelector('button[type="submit"]');
          if (submitBtn) submitBtn.disabled = true;
          if (status) {
            status.textContent = 'Posting...';
            status.className = 'text-[13px] text-hatch-fg-subtle';
          }
          try {
            const res = await fetch(form.dataset.endpoint, {
              method: 'POST',
              body: data,
              headers: { Accept: 'application/json' },
            });
            let body = null;
            try { body = await res.json(); } catch (_) { body = null; }
            if (!res.ok || !body || body.ok === false) {
              if (body && body.field_errors) paintFieldErrors(body.field_errors);
              const msg = (body && body.message) || 'Could not post comment.';
              if (status) {
                status.textContent = msg;
                status.className = 'text-[13px] text-red-600 dark:text-red-400';
              }
              return;
            }
            const wasApproved = body.status === 'approved' || body.approved === true;
            if (status) {
              status.textContent = wasApproved ? 'Comment posted.' : 'Held for moderation.';
              status.className = 'text-[13px] text-green-600 dark:text-green-400';
            }
            if (wasApproved) appendComment(author, content);
            form.reset();
            if (window.turnstile && tsResp) window.turnstile.reset();
          } catch (err) {
            if (status) {
              status.textContent = (err && err.message) || 'Could not reach the server.';
              status.className = 'text-[13px] text-red-600 dark:text-red-400';
            }
          } finally {
            if (submitBtn) submitBtn.disabled = false;
          }
        });
      })();
    <\/script></section>`}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/HatchComments.astro", void 0);
//#endregion
//#region src/components/HatchSchema.astro
createAstro("http://localhost:4321");
var $$HatchSchema = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$HatchSchema;
	const { schema } = Astro.props;
	return renderTemplate`${schema.map((item) => renderTemplate`<script type="application/ld+json">${unescapeHTML(JSON.stringify(item))}<\/script>`)}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/HatchSchema.astro", void 0);
//#endregion
//#region src/lib/blocks.ts
var WP_API = "https://hatch-wp-api.invalid/wp-json/wp/v2";
var WP_USER = WP_API_USER || "";
var WP_PASS = WP_API_PASS || "";
async function fetchPostBlocks(postId, context = "view") {
	if (!WP_API) return null;
	const url = `${WP_API.replace(/\/wp-json\/?$/, "").replace(/\/$/, "")}/wp-json/hatch/v1/post/${postId}/blocks?context=${context}`;
	const headers = { Accept: "application/json" };
	if (context === "edit" && WP_USER && WP_PASS) headers.Authorization = `Basic ${Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64")}`;
	try {
		const res = await fetch(url, { headers });
		if (!res.ok) return null;
		return await res.json();
	} catch (err) {
		return null;
	}
}
//#endregion
//#region src/components/blocks/core/_shared.ts
/**
* Build a className string from block attrs. Honors:
*   - block.attrs.className (Gutenberg "Additional CSS class" UI)
*   - block.attrs.align     ("left" | "right" | "center" | "wide" | "full")
*   - block.attrs.style     (inline padding / margin / typography → tailwind isn't reliable here,
*                            so we surface as style attribute via blockStyle())
*/
function blockClass(block, base = "") {
	const classes = [];
	if (base) classes.push(base);
	const a = block.attrs;
	if (typeof a.className === "string" && a.className) classes.push(a.className);
	if (typeof a.align === "string" && a.align) classes.push(`align${a.align}`);
	if (typeof a.textAlign === "string" && a.textAlign) classes.push(`text-${a.textAlign}`);
	return classes.join(" ");
}
/**
* Convert WP block style object → inline CSS string.
* Only handles the safe subset (spacing, color, typography).
* Anything else falls back to innerHTML.
*/
function blockStyle(block) {
	const style = block.attrs.style;
	if (!style || typeof style !== "object") return "";
	const out = [];
	const s = style;
	if (s.spacing?.padding) {
		const p = s.spacing.padding;
		if (p.top) out.push(`padding-top:${p.top}`);
		if (p.right) out.push(`padding-right:${p.right}`);
		if (p.bottom) out.push(`padding-bottom:${p.bottom}`);
		if (p.left) out.push(`padding-left:${p.left}`);
	}
	if (s.spacing?.margin) {
		const m = s.spacing.margin;
		if (m.top) out.push(`margin-top:${m.top}`);
		if (m.bottom) out.push(`margin-bottom:${m.bottom}`);
	}
	if (s.color?.background) out.push(`background:${s.color.background}`);
	if (s.color?.text) out.push(`color:${s.color.text}`);
	if (s.typography?.fontSize) out.push(`font-size:${s.typography.fontSize}`);
	if (s.typography?.fontWeight) out.push(`font-weight:${s.typography.fontWeight}`);
	if (s.typography?.lineHeight) out.push(`line-height:${s.typography.lineHeight}`);
	return out.join(";");
}
/**
* Extract inner text from WP-saved innerHTML (e.g. "<p>Hello</p>" → "Hello").
* Used by blocks that want clean text without their own wrapper tag.
*/
function stripOuterTag(html, tag) {
	const re = new RegExp(`^\\s*<${tag}[^>]*>([\\s\\S]*)<\\/${tag}>\\s*$`, "i");
	const m = html.match(re);
	return m ? m[1] : html;
}
//#endregion
//#region src/components/blocks/core/Paragraph.astro
createAstro("http://localhost:4321");
var $$Paragraph = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Paragraph;
	const { block } = Astro.props;
	const a = block.attrs;
	const cls = blockClass(block);
	const style = blockStyle(block);
	const text = stripOuterTag(block.innerHTML, "p");
	const dropCap = a.dropCap === true;
	return renderTemplate`${maybeRenderHead($$result)}<p${addAttribute([cls, { "has-drop-cap": dropCap }], "class:list")}${addAttribute(style || void 0, "style")}>${unescapeHTML(text)}</p>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Paragraph.astro", void 0);
//#endregion
//#region src/components/blocks/core/Heading.astro
createAstro("http://localhost:4321");
var $$Heading = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Heading;
	const { block } = Astro.props;
	const a = block.attrs;
	const level = typeof a.level === "number" ? Math.min(Math.max(a.level, 1), 6) : 2;
	const Tag = `h${level}`;
	const cls = blockClass(block);
	const style = blockStyle(block);
	const text = stripOuterTag(block.innerHTML, `h${level}`);
	const anchor = typeof a.anchor === "string" ? a.anchor : void 0;
	return renderTemplate`${renderComponent($$result, "Tag", Tag, {
		"id": anchor,
		"class": cls,
		"style": style || void 0
	}, { "default": ($$result) => renderTemplate`${unescapeHTML(text)}` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Heading.astro", void 0);
//#endregion
//#region src/components/blocks/core/List.astro
createAstro("http://localhost:4321");
var $$List = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$List;
	const { block } = Astro.props;
	const cls = blockClass(block);
	const style = blockStyle(block);
	return renderTemplate`${maybeRenderHead($$result)}<div${addAttribute(cls, "class")}${addAttribute(style || void 0, "style")}>${unescapeHTML(block.innerHTML)}</div>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/List.astro", void 0);
//#endregion
//#region src/components/blocks/core/Quote.astro
createAstro("http://localhost:4321");
var $$Quote = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Quote;
	const { block } = Astro.props;
	const a = block.attrs;
	const cls = blockClass(block, "wp-block-quote");
	const style = blockStyle(block);
	const citation = typeof a.citation === "string" ? a.citation : "";
	return renderTemplate`${maybeRenderHead($$result)}<blockquote${addAttribute(cls, "class")}${addAttribute(style || void 0, "style")}><div>${unescapeHTML(block.innerHTML)}</div>${citation && renderTemplate`<cite>${unescapeHTML(citation)}</cite>`}</blockquote>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Quote.astro", void 0);
//#endregion
//#region src/components/blocks/core/Pullquote.astro
createAstro("http://localhost:4321");
var $$Pullquote = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Pullquote;
	const { block } = Astro.props;
	const cls = blockClass(block, "wp-block-pullquote");
	const style = blockStyle(block);
	return renderTemplate`${maybeRenderHead($$result)}<figure${addAttribute(cls, "class")}${addAttribute(style || void 0, "style")}>${unescapeHTML(block.innerHTML)}</figure>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Pullquote.astro", void 0);
//#endregion
//#region src/components/blocks/core/Code.astro
createAstro("http://localhost:4321");
var $$Code = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Code;
	const { block } = Astro.props;
	const cls = blockClass(block, "wp-block-code");
	const style = blockStyle(block);
	const inner = stripOuterTag(stripOuterTag(block.innerHTML, "pre"), "code");
	return renderTemplate`${maybeRenderHead($$result)}<pre${addAttribute(cls, "class")}${addAttribute(style || void 0, "style")}><code>${unescapeHTML(inner)}</code></pre>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Code.astro", void 0);
//#endregion
//#region src/components/blocks/core/Preformatted.astro
createAstro("http://localhost:4321");
var $$Preformatted = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Preformatted;
	const { block } = Astro.props;
	const cls = blockClass(block, "wp-block-preformatted");
	const style = blockStyle(block);
	const text = stripOuterTag(block.innerHTML, "pre");
	return renderTemplate`${maybeRenderHead($$result)}<pre${addAttribute(cls, "class")}${addAttribute(style || void 0, "style")}>${unescapeHTML(text)}</pre>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Preformatted.astro", void 0);
//#endregion
//#region src/components/blocks/core/Verse.astro
createAstro("http://localhost:4321");
var $$Verse = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Verse;
	const { block } = Astro.props;
	const cls = blockClass(block, "wp-block-verse");
	const style = blockStyle(block);
	const text = stripOuterTag(block.innerHTML, "pre");
	return renderTemplate`${maybeRenderHead($$result)}<pre${addAttribute(cls, "class")}${addAttribute(style || void 0, "style")}>${unescapeHTML(text)}</pre>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Verse.astro", void 0);
//#endregion
//#region src/components/blocks/core/Image.astro
createAstro("http://localhost:4321");
var $$Image = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Image;
	const { block } = Astro.props;
	const a = block.attrs;
	const url = typeof a.url === "string" ? a.url : "";
	const alt = typeof a.alt === "string" ? a.alt : "";
	const caption = typeof a.caption === "string" ? a.caption : "";
	const width = typeof a.width === "number" ? a.width : void 0;
	const height = typeof a.height === "number" ? a.height : void 0;
	const href = typeof a.href === "string" ? a.href : "";
	const cls = blockClass(block, `wp-block-image size-${typeof a.sizeSlug === "string" ? a.sizeSlug : "large"}`);
	const style = blockStyle(block);
	const useOptimized = url && width && height;
	return renderTemplate`${url && renderTemplate`${maybeRenderHead($$result)}<figure${addAttribute(cls, "class")}${addAttribute(style || void 0, "style")}>${href ? renderTemplate`<a${addAttribute(href, "href")} rel="noopener">${useOptimized ? renderTemplate`${renderComponent($$result, "Image", $$Image$1, {
		"src": url,
		"alt": alt,
		"width": width,
		"height": height,
		"loading": "lazy",
		"decoding": "async"
	})}` : renderTemplate`<img${addAttribute(url, "src")}${addAttribute(alt, "alt")} loading="lazy" decoding="async">`}</a>` : useOptimized ? renderTemplate`${renderComponent($$result, "Image", $$Image$1, {
		"src": url,
		"alt": alt,
		"width": width,
		"height": height,
		"loading": "lazy",
		"decoding": "async"
	})}` : renderTemplate`<img${addAttribute(url, "src")}${addAttribute(alt, "alt")} loading="lazy" decoding="async">`}${caption && renderTemplate`<figcaption>${unescapeHTML(caption)}</figcaption>`}</figure>`}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Image.astro", void 0);
//#endregion
//#region src/components/blocks/core/Gallery.astro
createAstro("http://localhost:4321");
var $$Gallery = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Gallery;
	const { block, depth } = Astro.props;
	const a = block.attrs;
	const columns = typeof a.columns === "number" ? Math.min(Math.max(a.columns, 1), 8) : 3;
	const imageCrop = a.imageCrop !== false;
	const cls = blockClass(block, `wp-block-gallery columns-${columns}`);
	const gridStyle = `display:grid;gap:0.5rem;grid-template-columns:repeat(${columns}, minmax(0, 1fr));`;
	const itemAspect = imageCrop ? "aspect-ratio:1/1;overflow:hidden;" : "";
	return renderTemplate`${maybeRenderHead($$result)}<figure${addAttribute(cls, "class")}${addAttribute(gridStyle, "style")}>${block.innerBlocks.map((img) => renderTemplate`<div${addAttribute(itemAspect, "style")}>${renderComponent($$result, "BlockRenderer", $$BlockRenderer, {
		"blocks": [img],
		"depth": depth + 1
	})}</div>`)}</figure>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Gallery.astro", void 0);
//#endregion
//#region src/components/blocks/core/Video.astro
createAstro("http://localhost:4321");
var $$Video = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Video;
	const { block } = Astro.props;
	const a = block.attrs;
	const src = typeof a.src === "string" ? a.src : "";
	const poster = typeof a.poster === "string" ? a.poster : void 0;
	const autoplay = a.autoplay === true;
	const loop = a.loop === true;
	const muted = a.muted === true;
	const controls = a.controls !== false;
	const playsInline = a.playsInline === true;
	const preload = typeof a.preload === "string" ? a.preload : "metadata";
	const caption = typeof a.caption === "string" ? a.caption : "";
	const cls = blockClass(block, "wp-block-video");
	const style = blockStyle(block);
	return renderTemplate`${src && renderTemplate`${maybeRenderHead($$result)}<figure${addAttribute(cls, "class")}${addAttribute(style || void 0, "style")}><video${addAttribute(src, "src")}${addAttribute(poster, "poster")}${addAttribute(controls, "controls")}${addAttribute(autoplay, "autoplay")}${addAttribute(loop, "loop")}${addAttribute(muted, "muted")}${addAttribute(playsInline, "playsinline")}${addAttribute(preload, "preload")}></video>${caption && renderTemplate`<figcaption>${unescapeHTML(caption)}</figcaption>`}</figure>`}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Video.astro", void 0);
//#endregion
//#region src/components/blocks/core/Audio.astro
createAstro("http://localhost:4321");
var $$Audio = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Audio;
	const { block } = Astro.props;
	const a = block.attrs;
	const src = typeof a.src === "string" ? a.src : "";
	const loop = a.loop === true;
	const autoplay = a.autoplay === true;
	const preload = typeof a.preload === "string" ? a.preload : "metadata";
	const caption = typeof a.caption === "string" ? a.caption : "";
	const cls = blockClass(block, "wp-block-audio");
	const style = blockStyle(block);
	return renderTemplate`${src && renderTemplate`${maybeRenderHead($$result)}<figure${addAttribute(cls, "class")}${addAttribute(style || void 0, "style")}><audio${addAttribute(src, "src")} controls${addAttribute(autoplay, "autoplay")}${addAttribute(loop, "loop")}${addAttribute(preload, "preload")}></audio>${caption && renderTemplate`<figcaption>${unescapeHTML(caption)}</figcaption>`}</figure>`}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Audio.astro", void 0);
//#endregion
//#region src/components/blocks/core/Cover.astro
createAstro("http://localhost:4321");
var $$Cover = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Cover;
	const { block, depth } = Astro.props;
	const a = block.attrs;
	const url = typeof a.url === "string" ? a.url : "";
	const dimRatio = typeof a.dimRatio === "number" ? a.dimRatio : 50;
	const overlay = typeof a.overlayColor === "string" ? a.overlayColor : "#000";
	const focal = a.focalPoint && typeof a.focalPoint === "object" ? a.focalPoint : {
		x: .5,
		y: .5
	};
	const minHeight = typeof a.minHeight === "number" ? `${a.minHeight}${a.minHeightUnit || "px"}` : "430px";
	const cls = blockClass(block, `wp-block-cover ${a.isDark !== false ? "is-dark" : "is-light"}`);
	const wrapStyle = [
		blockStyle(block),
		"position:relative",
		"display:flex",
		"align-items:center",
		"justify-content:center",
		"overflow:hidden",
		`min-height:${minHeight}`
	].join(";");
	const bgStyle = url ? [
		"position:absolute",
		"inset:0",
		`background-image:url(${url})`,
		"background-size:cover",
		`background-position:${focal.x * 100}% ${focal.y * 100}%`
	].join(";") : "";
	const overlayStyle = [
		"position:absolute",
		"inset:0",
		`background:${overlay}`,
		`opacity:${dimRatio / 100}`
	].join(";");
	return renderTemplate`${maybeRenderHead($$result)}<div${addAttribute(cls, "class")}${addAttribute(wrapStyle, "style")}>${url && renderTemplate`<div aria-hidden="true"${addAttribute(bgStyle, "style")}></div>`}<div aria-hidden="true"${addAttribute(overlayStyle, "style")}></div><div class="wp-block-cover__inner-container" style="position:relative;z-index:1;">${renderComponent($$result, "BlockRenderer", $$BlockRenderer, {
		"blocks": block.innerBlocks,
		"depth": depth + 1
	})}</div></div>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Cover.astro", void 0);
//#endregion
//#region src/components/blocks/core/MediaText.astro
createAstro("http://localhost:4321");
var $$MediaText = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$MediaText;
	const { block, depth } = Astro.props;
	const a = block.attrs;
	const mediaUrl = typeof a.mediaUrl === "string" ? a.mediaUrl : "";
	const mediaAlt = typeof a.mediaAlt === "string" ? a.mediaAlt : "";
	const mediaPos = a.mediaPosition === "right" ? "right" : "left";
	const mediaW = typeof a.mediaWidth === "number" ? a.mediaWidth : 50;
	const isStacked = a.isStackedOnMobile !== false;
	const cls = blockClass(block, `wp-block-media-text has-media-on-the-${mediaPos}`);
	const wrapStyle = [
		blockStyle(block),
		"display:grid",
		`grid-template-columns:${mediaPos === "right" ? `1fr ${mediaW}%` : `${mediaW}% 1fr`}`,
		"gap:1.5rem",
		"align-items:center"
	].join(";");
	return renderTemplate`${maybeRenderHead($$result)}<div${addAttribute(cls, "class")}${addAttribute(wrapStyle, "style")}${addAttribute(isStacked ? "true" : "false", "data-stacked")}>${mediaPos === "left" && mediaUrl && renderTemplate`<figure class="wp-block-media-text__media"><img${addAttribute(mediaUrl, "src")}${addAttribute(mediaAlt, "alt")} loading="lazy" decoding="async"></figure>`}<div class="wp-block-media-text__content">${renderComponent($$result, "BlockRenderer", $$BlockRenderer, {
		"blocks": block.innerBlocks,
		"depth": depth + 1
	})}</div>${mediaPos === "right" && mediaUrl && renderTemplate`<figure class="wp-block-media-text__media"><img${addAttribute(mediaUrl, "src")}${addAttribute(mediaAlt, "alt")} loading="lazy" decoding="async"></figure>`}</div>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/MediaText.astro", void 0);
//#endregion
//#region src/components/blocks/core/Group.astro
createAstro("http://localhost:4321");
var $$Group = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Group;
	const { block, depth } = Astro.props;
	const a = block.attrs;
	const layout = a.layout && typeof a.layout === "object" ? a.layout : {};
	const cls = blockClass(block, `wp-block-group ${layout.type === "flex" ? `is-layout-flex is-${layout.orientation || "horizontal"}` : "is-layout-constrained"}`);
	const style = blockStyle(block);
	const Tag = typeof a.tagName === "string" ? a.tagName : "div";
	return renderTemplate`${renderComponent($$result, "Tag", Tag, {
		"class": cls,
		"style": style || void 0
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "BlockRenderer", $$BlockRenderer, {
		"blocks": block.innerBlocks,
		"depth": depth + 1
	})}` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Group.astro", void 0);
//#endregion
//#region src/components/blocks/core/Columns.astro
createAstro("http://localhost:4321");
var $$Columns = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Columns;
	const { block, depth } = Astro.props;
	const isStackedOnMobile = block.attrs.isStackedOnMobile !== false;
	const colCount = block.innerBlocks.length || 1;
	const cls = blockClass(block, "wp-block-columns");
	const wrapStyle = [
		blockStyle(block),
		"display:grid",
		`grid-template-columns:repeat(${colCount}, minmax(0, 1fr))`,
		"gap:1.5rem"
	].join(";");
	return renderTemplate`${maybeRenderHead($$result)}<div${addAttribute(cls, "class")}${addAttribute(wrapStyle, "style")}${addAttribute(isStackedOnMobile ? "true" : "false", "data-stacked")}>${renderComponent($$result, "BlockRenderer", $$BlockRenderer, {
		"blocks": block.innerBlocks,
		"depth": depth + 1
	})}</div>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Columns.astro", void 0);
//#endregion
//#region src/components/blocks/core/Column.astro
createAstro("http://localhost:4321");
var $$Column = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Column;
	const { block, depth } = Astro.props;
	const a = block.attrs;
	const widthAttr = typeof a.width === "string" ? a.width : "";
	const cls = blockClass(block, "wp-block-column");
	const base = blockStyle(block);
	const colStyle = widthAttr ? `${base ? base + ";" : ""}flex-basis:${widthAttr};max-width:${widthAttr};` : base;
	return renderTemplate`${maybeRenderHead($$result)}<div${addAttribute(cls, "class")}${addAttribute(colStyle || void 0, "style")}>${renderComponent($$result, "BlockRenderer", $$BlockRenderer, {
		"blocks": block.innerBlocks,
		"depth": depth + 1
	})}</div>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Column.astro", void 0);
//#endregion
//#region src/components/blocks/core/Separator.astro
createAstro("http://localhost:4321");
var $$Separator = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Separator;
	const { block } = Astro.props;
	const cls = blockClass(block, "wp-block-separator");
	const style = blockStyle(block);
	return renderTemplate`${maybeRenderHead($$result)}<hr${addAttribute(cls, "class")}${addAttribute(style || void 0, "style")}>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Separator.astro", void 0);
//#endregion
//#region src/components/blocks/core/Spacer.astro
createAstro("http://localhost:4321");
var $$Spacer = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Spacer;
	const { block } = Astro.props;
	const a = block.attrs;
	const height = typeof a.height === "string" ? a.height : "100px";
	const cls = blockClass(block, "wp-block-spacer");
	return renderTemplate`${maybeRenderHead($$result)}<div${addAttribute(cls, "class")} aria-hidden="true"${addAttribute(`height:${height};`, "style")}></div>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Spacer.astro", void 0);
//#endregion
//#region src/components/blocks/core/Buttons.astro
createAstro("http://localhost:4321");
var $$Buttons = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Buttons;
	const { block, depth } = Astro.props;
	const a = block.attrs;
	const layout = a.layout && typeof a.layout === "object" ? a.layout : {};
	const orientation = layout.orientation || "horizontal";
	const justify = layout.justifyContent || "flex-start";
	const cls = blockClass(block, "wp-block-buttons");
	const style = [
		blockStyle(block),
		"display:flex",
		`flex-direction:${orientation === "vertical" ? "column" : "row"}`,
		`justify-content:${justify}`,
		"gap:0.75rem",
		"flex-wrap:wrap"
	].join(";");
	return renderTemplate`${maybeRenderHead($$result)}<div${addAttribute(cls, "class")}${addAttribute(style, "style")}>${renderComponent($$result, "BlockRenderer", $$BlockRenderer, {
		"blocks": block.innerBlocks,
		"depth": depth + 1
	})}</div>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Buttons.astro", void 0);
//#endregion
//#region src/components/blocks/core/Button.astro
createAstro("http://localhost:4321");
var $$Button = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Button;
	const { block } = Astro.props;
	const a = block.attrs;
	const url = typeof a.url === "string" ? a.url : "#";
	const text = typeof a.text === "string" ? a.text : "";
	const linkTarget = typeof a.linkTarget === "string" ? a.linkTarget : void 0;
	const rel = typeof a.rel === "string" ? a.rel : linkTarget === "_blank" ? "noopener" : void 0;
	const cls = blockClass(block, `wp-block-button ${typeof a.className === "string" && a.className.includes("is-style-outline") ? "is-style-outline" : ""}`);
	const style = blockStyle(block);
	const label = text || (block.innerHTML ? block.innerHTML.replace(/<[^>]+>/g, "").trim() : "Button");
	return renderTemplate`${maybeRenderHead($$result)}<div${addAttribute(cls, "class")}${addAttribute(style || void 0, "style")}><a class="wp-block-button__link"${addAttribute(url, "href")}${addAttribute(linkTarget, "target")}${addAttribute(rel, "rel")}>${label}</a></div>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Button.astro", void 0);
//#endregion
//#region src/components/blocks/core/Details.astro
createAstro("http://localhost:4321");
var $$Details = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Details;
	const { block, depth } = Astro.props;
	const a = block.attrs;
	const summary = typeof a.summary === "string" ? a.summary : "Details";
	const showContent = a.showContent === true;
	const cls = blockClass(block, "wp-block-details");
	const style = blockStyle(block);
	return renderTemplate`${maybeRenderHead($$result)}<details${addAttribute(cls, "class")}${addAttribute(style || void 0, "style")}${addAttribute(showContent || void 0, "open")}><summary>${unescapeHTML(summary)}</summary>${renderComponent($$result, "BlockRenderer", $$BlockRenderer, {
		"blocks": block.innerBlocks,
		"depth": depth + 1
	})}</details>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Details.astro", void 0);
//#endregion
//#region src/components/blocks/core/Embed.astro
createAstro("http://localhost:4321");
var $$Embed = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Embed;
	const { block } = Astro.props;
	const a = block.attrs;
	const provider = typeof a.providerNameSlug === "string" ? a.providerNameSlug : "embed";
	const aspect = a.aspectRatio === "21/9" ? "21 / 9" : a.aspectRatio === "4/3" ? "4 / 3" : a.aspectRatio === "1/1" ? "1 / 1" : "16 / 9";
	const cls = blockClass(block, `wp-block-embed is-provider-${provider}`);
	const wrap = [
		blockStyle(block),
		`aspect-ratio:${aspect}`,
		"width:100%"
	].filter(Boolean).join(";");
	let html = block.innerHTML || "";
	html = html.replace(/<iframe([^>]*)>/gi, (_m, attrs) => {
		return `<iframe loading="lazy" width="100%" height="100%"${attrs.replace(/\s(loading|width|height)="[^"]*"/gi, "")}>`;
	});
	return renderTemplate`${maybeRenderHead($$result)}<figure${addAttribute(cls, "class")}${addAttribute(wrap, "style")}><div class="wp-block-embed__wrapper" style="width:100%;height:100%;">${unescapeHTML(html)}</div></figure>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Embed.astro", void 0);
//#endregion
//#region src/components/blocks/core/Html.astro
createAstro("http://localhost:4321");
var $$Html = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Html;
	const { block } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<div>${unescapeHTML(block.innerHTML)}</div>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Html.astro", void 0);
//#endregion
//#region src/components/blocks/core/Table.astro
createAstro("http://localhost:4321");
var $$Table = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Table;
	const { block } = Astro.props;
	const cls = blockClass(block, "wp-block-table");
	const style = blockStyle(block);
	return renderTemplate`${maybeRenderHead($$result)}<figure${addAttribute(cls, "class")}${addAttribute(style || void 0, "style")}>${unescapeHTML(block.innerHTML)}</figure>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/core/Table.astro", void 0);
//#endregion
//#region src/components/hatch-blocks/HatchHero.astro
createAstro("http://localhost:4321");
var $$HatchHero = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$HatchHero;
	const { eyebrow, heading, subhead, primaryCtaText, primaryCtaUrl, secondaryCtaText, secondaryCtaUrl, variant = "centered", backgroundStyle = "gradient-aurora", backgroundImage = null, darkText = false } = Astro.props;
	const wrapClasses = [
		"hatch-hero relative isolate overflow-hidden",
		{
			"gradient-aurora": "bg-gradient-to-br from-emerald-400 via-teal-500 to-violet-600",
			"gradient-sunset": "bg-gradient-to-br from-rose-500 via-fuchsia-500 to-purple-600",
			"gradient-ocean": "bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600",
			"gradient-mint": "bg-gradient-to-br from-emerald-50 via-white to-cyan-50",
			"gradient-midnight": "bg-gradient-to-br from-slate-800 via-slate-900 to-black",
			"solid-primary": "bg-primary",
			"solid-surface": "bg-surface",
			"image": "bg-cover bg-center relative",
			"plain": "bg-background"
		}[backgroundStyle] || "",
		darkText ? "text-foreground" : "text-white"
	].filter(Boolean).join(" ");
	const style = backgroundStyle === "image" && backgroundImage?.url ? `background-image: url("${backgroundImage.url}")` : void 0;
	return renderTemplate`${maybeRenderHead($$result)}<section${addAttribute(wrapClasses, "class")}${addAttribute(style, "style")}>${backgroundStyle === "image" && renderTemplate`<div class="absolute inset-0 bg-black/40 pointer-events-none" aria-hidden="true"></div>`}<div class="relative">${variant === "split" ? renderTemplate`<div class="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto px-6 py-24 lg:py-32"><div class="flex flex-col gap-6">${eyebrow && renderTemplate`<span class="text-sm font-medium tracking-widest uppercase opacity-80">${eyebrow}</span>`}<h1 class="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">${unescapeHTML(heading)}</h1>${subhead && renderTemplate`<p class="text-lg md:text-xl opacity-90 max-w-2xl">${unescapeHTML(subhead)}</p>`}<div class="flex flex-wrap gap-3 mt-2">${primaryCtaText && renderTemplate`<a${addAttribute(primaryCtaUrl || "#", "href")} class="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-6 py-3 font-medium hover:opacity-90 transition">${primaryCtaText}</a>`}${secondaryCtaText && renderTemplate`<a${addAttribute(secondaryCtaUrl || "#", "href")} class="inline-flex items-center gap-2 rounded-lg border-2 border-current px-6 py-3 font-medium hover:bg-current hover:text-background transition">${secondaryCtaText}</a>`}</div></div>${backgroundImage?.url && renderTemplate`<img${addAttribute(backgroundImage.url, "src")}${addAttribute(backgroundImage.alt || "", "alt")} class="rounded-2xl shadow-2xl w-full h-auto">`}</div>` : renderTemplate`<div${addAttribute(variant === "left" ? "max-w-5xl mx-auto px-6 py-24 lg:py-32" : "max-w-4xl mx-auto px-6 py-24 lg:py-32", "class")}><div${addAttribute(`flex flex-col gap-6 ${variant === "left" ? "items-start text-left" : "items-center text-center"} max-w-2xl ${variant === "centered" ? "mx-auto" : ""}`, "class")}>${eyebrow && renderTemplate`<span class="text-sm font-medium tracking-widest uppercase opacity-80">${eyebrow}</span>`}<h1 class="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">${unescapeHTML(heading)}</h1>${subhead && renderTemplate`<p class="text-lg md:text-xl opacity-90 max-w-2xl">${unescapeHTML(subhead)}</p>`}<div${addAttribute(`flex flex-wrap gap-3 mt-2 ${variant === "centered" ? "justify-center" : ""}`, "class")}>${primaryCtaText && renderTemplate`<a${addAttribute(primaryCtaUrl || "#", "href")} class="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-6 py-3 font-medium hover:opacity-90 transition">${primaryCtaText}</a>`}${secondaryCtaText && renderTemplate`<a${addAttribute(secondaryCtaUrl || "#", "href")} class="inline-flex items-center gap-2 rounded-lg border-2 border-current px-6 py-3 font-medium hover:bg-current hover:text-background transition">${secondaryCtaText}</a>`}</div></div></div>`}</div></section>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/hatch-blocks/HatchHero.astro", void 0);
//#endregion
//#region src/components/hatch-blocks/HatchSection.astro
createAstro("http://localhost:4321");
var $$HatchSection = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$HatchSection;
	const { backgroundToken = "", textToken = "", gradient = "", as = "section", class: extra = "" } = Astro.props;
	const Tag = as;
	const classes = [
		"hatch-section relative",
		backgroundToken && `bg-${backgroundToken}`,
		textToken && `text-${textToken}`,
		gradient,
		extra
	].filter(Boolean).join(" ");
	return renderTemplate`${renderComponent($$result, "Tag", Tag, { "class": classes }, { "default": ($$result) => renderTemplate`${renderSlot($$result, $$slots["default"])}` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/hatch-blocks/HatchSection.astro", void 0);
//#endregion
//#region src/components/hatch-blocks/HatchContent.astro
createAstro("http://localhost:4321");
var $$HatchContent = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$HatchContent;
	const { html, hydrateInteractive = true } = Astro.props;
	const needsInteractive = hydrateInteractive && /hatch-shadow-code|data-hatch-interactive/.test(html);
	return renderTemplate`${maybeRenderHead($$result)}<div class="hatch-content">${unescapeHTML(html)}</div>${needsInteractive && renderTemplate`<script type="module" src="/hatch-interactive.js"><\/script>`}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/hatch-blocks/HatchContent.astro", void 0);
//#endregion
//#region src/components/blocks/registry.ts
/**
* The registry. Keys are exact WordPress block names.
*/
var REGISTRY = {
	"core/paragraph": $$Paragraph,
	"core/heading": $$Heading,
	"core/list": $$List,
	"core/list-item": $$List,
	"core/quote": $$Quote,
	"core/pullquote": $$Pullquote,
	"core/code": $$Code,
	"core/preformatted": $$Preformatted,
	"core/verse": $$Verse,
	"core/image": $$Image,
	"core/gallery": $$Gallery,
	"core/video": $$Video,
	"core/audio": $$Audio,
	"core/cover": $$Cover,
	"core/media-text": $$MediaText,
	"core/group": $$Group,
	"core/columns": $$Columns,
	"core/column": $$Column,
	"core/separator": $$Separator,
	"core/spacer": $$Spacer,
	"core/buttons": $$Buttons,
	"core/button": $$Button,
	"core/details": $$Details,
	"core/html": $$Html,
	"core/table": $$Table,
	"core/embed": $$Embed,
	"hatch/hero": $$HatchHero,
	"hatch/section": $$HatchSection,
	"hatch/content": $$HatchContent
};
/**
* Resolve a block name to its Astro component.
*
* Falls back through:
*   1. Exact match (e.g. "core/paragraph")
*   2. Embed namespace check (any "core-embed/*" or "core/embed-*" → Embed)
*   3. null (caller renders innerHTML fallback)
*/
function resolveBlock(name) {
	if (REGISTRY[name]) return REGISTRY[name];
	if (name.startsWith("core-embed/") || name.startsWith("core/embed-")) return REGISTRY["core/embed"];
	return null;
}
//#endregion
//#region src/components/blocks/BlockRenderer.astro
createAstro("http://localhost:4321");
var $$BlockRenderer = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$BlockRenderer;
	const { blocks, depth = 0 } = Astro.props;
	return renderTemplate`${depth < 12 && blocks.map((block) => {
		const Component = resolveBlock(block.name);
		if (Component) return renderTemplate`${renderComponent($$result, "Component", Component, {
			"block": block,
			"depth": depth
		})}`;
		return renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`${block.innerHTML && renderTemplate`${maybeRenderHead($$result)}<div>${unescapeHTML(block.innerHTML)}</div>`}${block.innerBlocks.length > 0 && renderTemplate`${renderComponent($$result, "Astro.self", Astro.self, {
			"blocks": block.innerBlocks,
			"depth": depth + 1
		})}`}` })}`;
	})}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/blocks/BlockRenderer.astro", void 0);
//#endregion
//#region src/components/theme/ShareRow.astro
createAstro("http://localhost:4321");
var $$ShareRow = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$ShareRow;
	const { features, title, url } = Astro.props;
	const s = features.aesthetic.share;
	const shareText = encodeURIComponent(`${title} — ${url}`);
	const shareUrl = encodeURIComponent(url);
	const NETS = [
		{
			key: "x",
			label: "X",
			href: `https://twitter.com/intent/tweet?text=${shareText}`,
			kind: "brand",
			path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
		},
		{
			key: "linkedin",
			label: "LinkedIn",
			href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
			kind: "brand",
			path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
		},
		{
			key: "whatsapp",
			label: "WhatsApp",
			href: `https://wa.me/?text=${shareText}`,
			kind: "brand",
			path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"
		},
		{
			key: "facebook",
			label: "Facebook",
			href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
			kind: "brand",
			path: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 011.141.195v3.325a8.623 8.623 0 00-.653-.036 26.805 26.805 0 00-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 00-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647z"
		},
		{
			key: "reddit",
			label: "Reddit",
			href: `https://www.reddit.com/submit?url=${shareUrl}&title=${shareText}`,
			kind: "brand",
			path: "M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"
		},
		{
			key: "email",
			label: "Email",
			href: `mailto:?subject=${shareText}&body=${shareUrl}`,
			kind: "line",
			path: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6"
		},
		{
			key: "copy",
			label: "Copy link",
			href: url,
			copy: true,
			kind: "line",
			path: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
		}
	];
	return renderTemplate`${maybeRenderHead($$result)}<div class="flex flex-wrap items-center gap-2"><span class="text-[12.5px] text-hatch-fg-subtle mr-1">Share</span>${NETS.filter((n) => s[n.key]).map((n) => n.copy ? renderTemplate`<button type="button"${addAttribute(url, "data-url")}${addAttribute(n.label, "aria-label")}${addAttribute(n.label, "title")} class="hatch-share-copy inline-flex items-center justify-center w-9 h-9 rounded-md border border-hatch-border text-hatch-fg-muted hover:text-hatch-fg hover:border-hatch-fg hover:bg-hatch-bg-2 transition-colors"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" aria-hidden="true"><path${addAttribute(n.path, "d")}></path></svg></button>` : renderTemplate`<a${addAttribute(n.href, "href")} target="_blank" rel="noopener noreferrer"${addAttribute(n.label, "aria-label")}${addAttribute(n.label, "title")} class="inline-flex items-center justify-center w-9 h-9 rounded-md border border-hatch-border text-hatch-fg-muted hover:text-hatch-fg hover:border-hatch-fg hover:bg-hatch-bg-2 transition-colors">${n.kind === "brand" ? renderTemplate`<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path${addAttribute(n.path, "d")}></path></svg>` : renderTemplate`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" aria-hidden="true"><path${addAttribute(n.path, "d")}></path></svg>`}</a>`)}</div><script>
  document.querySelectorAll('.hatch-share-copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url') || '';
      navigator.clipboard?.writeText(url);
      btn.setAttribute('title', 'Copied!');
      setTimeout(() => btn.setAttribute('title', 'Copy link'), 1500);
    });
  });
<\/script>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/theme/ShareRow.astro", void 0);
//#endregion
//#region src/components/theme/tech/Single.astro
createAstro("http://localhost:4321");
var $$Single$4 = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Single$4;
	const { post, features, toc, adjacent, dateLabel, updatedLabel, canonical, bodyHtml, flags } = Astro.props;
	const showSidebar = flags.sidebarSide !== "none" && toc.length > 0;
	return renderTemplate`${maybeRenderHead($$result)}<article class="mx-auto px-5 sm:px-8 py-10 sm:py-14" style="max-width: var(--hatch-max-width, 1160px);">${flags.showBreadcrumb && renderTemplate`<nav aria-label="Breadcrumb" class="flex items-center gap-2 text-[12px] mb-8 flex-wrap" style="font-family: var(--hatch-font-mono, ui-monospace, monospace); color: var(--hatch-fg-subtle);"><span>~</span><span>/</span><a href="/blog" class="hover:text-hatch-primary transition-colors">blog</a>${post.category && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<span>/</span><a${addAttribute(`/blog/category/${post.categorySlug}`, "href")} class="hover:text-hatch-primary transition-colors">${post.categorySlug}</a>` })}`}<span>/</span><span class="text-hatch-fg truncate max-w-[260px] sm:max-w-none">${post.slug}</span></nav>`}<header class="max-w-3xl mb-10"><div class="text-[11px] mb-4" style="font-family: var(--hatch-font-mono, ui-monospace, monospace); color: var(--hatch-primary);">// ${post.category || "post"}.md</div><h1 class="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]" style="font-family: var(--hatch-font-heading);">${post.title}</h1><div class="mt-6 p-4 rounded-md border border-hatch-border bg-hatch-bg-2 text-[12.5px]" style="font-family: var(--hatch-font-mono, ui-monospace, monospace);"><div class="flex flex-wrap gap-x-4 gap-y-1 text-hatch-fg-muted"><span><span class="text-hatch-fg-subtle">author:</span> ${post.author?.name || "anonymous"}</span><span><span class="text-hatch-fg-subtle">date:</span> <time${addAttribute(post.publishedAt, "datetime")}>${dateLabel}</time></span>${flags.showReadingTime && renderTemplate`<span><span class="text-hatch-fg-subtle">read:</span> ${flags.readingTimeText(post.readMinutes)}</span>`}${flags.showUpdated && updatedLabel && renderTemplate`<span><span class="text-hatch-fg-subtle">updated:</span> ${updatedLabel}</span>`}</div></div></header>${flags.showHeroImage && renderTemplate`<div class="aspect-[2/1] rounded-md overflow-hidden bg-hatch-bg-3 mb-12 max-w-5xl border border-hatch-border">${renderComponent($$result, "HatchImage", $$HatchImage, {
		"src": post.featuredImage,
		"alt": post.title,
		"class": "w-full h-full object-cover",
		"width": 1600,
		"height": 800
	})}</div>`}<div${addAttribute(`grid gap-x-10 gap-y-8 ${showSidebar ? `max-w-5xl ` + (flags.sidebarSide === "left" ? "lg:grid-cols-[240px_1fr]" : "lg:grid-cols-[1fr_240px]") : "grid-cols-1"}`, "class")}><div${addAttribute(`hatch-prose min-w-0 ${flags.sidebarSide === "left" ? "lg:order-2" : "lg:order-1"}`, "class")}><div>${unescapeHTML(bodyHtml)}</div></div>${showSidebar && renderTemplate`<aside${addAttribute(`hidden lg:block ${flags.sidebarSide === "left" ? "lg:order-1" : "lg:order-2"}`, "class")}><div class="sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2" style="font-family: var(--hatch-font-mono, ui-monospace, monospace);"><div class="text-[11px] uppercase tracking-widest text-hatch-fg-subtle mb-3">// ${features.aesthetic.reading.toc_label}</div><nav class="flex flex-col gap-1 text-[12.5px]" aria-label="Table of Contents">${toc.map((item) => renderTemplate`<a${addAttribute(`#${item.id}`, "href")}${addAttribute(`hover:text-hatch-primary transition-colors text-hatch-fg-muted ${item.level === 3 ? "pl-3" : ""}`, "class")}>${item.text}</a>`)}</nav></div></aside>`}</div>${flags.showShare && renderTemplate`<div class="max-w-3xl mt-12 pt-8 border-t border-hatch-border">${renderComponent($$result, "ShareRow", $$ShareRow, {
		"features": features,
		"title": post.title,
		"url": canonical
	})}</div>`}${flags.showAuthorBio && post.author?.description && renderTemplate`<div class="max-w-3xl mt-12 p-5 border border-hatch-border rounded-md bg-hatch-bg-2 flex gap-4 items-start" style="font-family: var(--hatch-font-mono, ui-monospace, monospace); font-size: 13px;">${post.author.avatar && renderTemplate`<img${addAttribute(post.author.avatar, "src")}${addAttribute(post.author.name, "alt")} width="40" height="40"${addAttribute(`${flags.avatarShape} flex-shrink-0`, "class")} loading="lazy">`}<div class="min-w-0"><div class="text-hatch-primary">// author</div><a${addAttribute(`/blog/author/${post.author.slug}`, "href")} class="text-hatch-fg hover:text-hatch-primary">${post.author.name}</a><p class="text-hatch-fg-muted mt-1 leading-relaxed">${post.author.description}</p></div></div>`}${flags.showPrevNext && (adjacent.prev || adjacent.next) && renderTemplate`<nav class="max-w-3xl mt-12 pt-8 border-t border-hatch-border grid grid-cols-1 sm:grid-cols-2 gap-3" style="font-family: var(--hatch-font-mono, ui-monospace, monospace);" aria-label="Post navigation">${adjacent.prev && renderTemplate`<a${addAttribute(`/blog/${adjacent.prev.slug}`, "href")} class="group p-4 rounded-md border border-hatch-border hover:border-hatch-primary transition-colors text-[13px]"><span class="text-hatch-primary">← prev</span><div class="mt-1 text-hatch-fg group-hover:text-hatch-primary line-clamp-2">${adjacent.prev.title}</div></a>`}${adjacent.next && renderTemplate`<a${addAttribute(`/blog/${adjacent.next.slug}`, "href")} class="group p-4 rounded-md border border-hatch-border hover:border-hatch-primary transition-colors text-[13px] sm:text-right"><span class="text-hatch-primary">next →</span><div class="mt-1 text-hatch-fg group-hover:text-hatch-primary line-clamp-2">${adjacent.next.title}</div></a>`}</nav>`}${renderSlot($$result, $$slots["related"])}${renderSlot($$result, $$slots["comments"])}</article>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/theme/tech/Single.astro", void 0);
//#endregion
//#region src/components/theme/docs/Single.astro
createAstro("http://localhost:4321");
var $$Single$3 = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Single$3;
	const { post, features, toc, adjacent, dateLabel, updatedLabel, canonical, bodyHtml, flags } = Astro.props;
	const sidebarSide = flags.sidebarSide || "left";
	const showSidebar = sidebarSide !== "none";
	const gridCols = !showSidebar ? "lg:grid-cols-[1fr]" : sidebarSide === "right" ? "lg:grid-cols-[1fr_220px]" : "lg:grid-cols-[220px_1fr]";
	return renderTemplate`${maybeRenderHead($$result)}<div${addAttribute(`mx-auto px-5 sm:px-8 grid gap-x-10 gap-y-8 ${gridCols}`, "class")} style="max-width: var(--hatch-max-width, 1160px);">${showSidebar && sidebarSide === "left" && renderTemplate`${renderComponent($$result, "DocsSidebar", $$DocsSidebar, { "activeCategorySlug": post.categorySlug || null })}`}<article class="py-8 sm:py-12 min-w-0">${flags.showBreadcrumb && renderTemplate`<nav aria-label="Breadcrumb" class="flex items-center gap-2 text-[12px] text-hatch-fg-subtle mb-5 flex-wrap"><a href="/blog" class="hover:text-hatch-fg transition-colors">Docs</a>${post.category && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<span>${flags.breadcrumbSep}</span><a${addAttribute(`/blog/category/${post.categorySlug}`, "href")} class="hover:text-hatch-fg transition-colors">${post.category}</a>` })}`}<span>${flags.breadcrumbSep}</span><span class="text-hatch-fg truncate">${post.title}</span></nav>`}<header class="mb-8"><h1 class="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.15]" style="font-family: var(--hatch-font-heading);">${post.title}</h1><div class="mt-3 flex items-center flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-hatch-fg-muted">${post.author && renderTemplate`<a${addAttribute(`/blog/author/${post.author.slug}`, "href")} class="hover:text-hatch-fg transition-colors">${post.author.name}</a>`}<span class="text-hatch-fg-subtle">·</span><time${addAttribute(post.publishedAt, "datetime")}>${dateLabel}</time>${flags.showReadingTime && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<span class="text-hatch-fg-subtle">·</span><span>${flags.readingTimeText(post.readMinutes)}</span>` })}`}</div>${flags.showUpdated && updatedLabel && renderTemplate`<p class="mt-2 text-[12px] text-hatch-fg-subtle">Updated ${updatedLabel}</p>`}</header>${flags.showHeroImage && renderTemplate`<div class="aspect-[2/1] rounded-md overflow-hidden bg-hatch-bg-3 mb-8 border border-hatch-border">${renderComponent($$result, "HatchImage", $$HatchImage, {
		"src": post.featuredImage,
		"alt": post.title,
		"class": "w-full h-full object-cover",
		"width": 1200,
		"height": 600
	})}</div>`}<div class="hatch-prose"><div>${unescapeHTML(bodyHtml)}</div></div>${flags.showShare && renderTemplate`<div class="mt-10 pt-6 border-t border-hatch-border">${renderComponent($$result, "ShareRow", $$ShareRow, {
		"features": features,
		"title": post.title,
		"url": canonical
	})}</div>`}${flags.showAuthorBio && post.author?.description && renderTemplate`<div class="mt-10 p-5 rounded-md border border-hatch-border bg-hatch-bg-2 flex gap-4 items-start">${post.author.avatar && renderTemplate`<img${addAttribute(post.author.avatar, "src")}${addAttribute(post.author.name, "alt")} width="44" height="44"${addAttribute(`${flags.avatarShape} flex-shrink-0`, "class")} loading="lazy">`}<div class="min-w-0"><a${addAttribute(`/blog/author/${post.author.slug}`, "href")} class="font-semibold text-hatch-fg hover:text-hatch-primary text-[14px]">${post.author.name}</a><p class="text-[13.5px] text-hatch-fg-muted mt-1 leading-relaxed">${post.author.description}</p></div></div>`}${flags.showPrevNext && (adjacent.prev || adjacent.next) && renderTemplate`<nav class="mt-10 pt-6 border-t border-hatch-border grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Doc navigation">${adjacent.prev && renderTemplate`<a${addAttribute(`/blog/${adjacent.prev.slug}`, "href")} class="group p-4 rounded-md border border-hatch-border hover:border-hatch-primary transition-colors"><span class="text-[11px] uppercase tracking-wider text-hatch-primary">← Previous</span><div class="mt-1 text-[14px] text-hatch-fg group-hover:text-hatch-primary line-clamp-2">${adjacent.prev.title}</div></a>`}${adjacent.next && renderTemplate`<a${addAttribute(`/blog/${adjacent.next.slug}`, "href")} class="group p-4 rounded-md border border-hatch-border hover:border-hatch-primary transition-colors sm:text-right"><span class="text-[11px] uppercase tracking-wider text-hatch-primary">Next →</span><div class="mt-1 text-[14px] text-hatch-fg group-hover:text-hatch-primary line-clamp-2">${adjacent.next.title}</div></a>`}</nav>`}${renderSlot($$result, $$slots["related"])}${renderSlot($$result, $$slots["comments"])}</article>${showSidebar && sidebarSide === "right" && renderTemplate`${renderComponent($$result, "DocsSidebar", $$DocsSidebar, { "activeCategorySlug": post.categorySlug || null })}`}</div>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/theme/docs/Single.astro", void 0);
//#endregion
//#region src/components/theme/astropaper/Single.astro
createAstro("http://localhost:4321");
var $$Single$2 = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Single$2;
	const { post, features, toc, adjacent, dateLabel, updatedLabel, canonical, bodyHtml, flags } = Astro.props;
	const showSidebar = flags.sidebarSide !== "none" && toc.length > 0;
	return renderTemplate`${maybeRenderHead($$result)}<article class="mx-auto px-5 sm:px-8 py-12 sm:py-16" style="max-width: var(--hatch-max-width, 1160px); font-family: var(--hatch-font-heading);">${flags.showBreadcrumb && renderTemplate`<nav aria-label="Breadcrumb" class="flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest text-hatch-fg-subtle mb-6 flex-wrap">${post.category && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<a${addAttribute(`/blog/category/${post.categorySlug}`, "href")} class="hover:text-hatch-primary transition-colors">${post.category}</a><span class="opacity-60">·</span>` })}`}<time${addAttribute(post.publishedAt, "datetime")}>${dateLabel}</time></nav>`}<header class="max-w-2xl mx-auto mb-8 text-center"><h1 class="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05]" style="font-family: var(--hatch-font-heading);">${post.title}</h1>${post.excerpt && renderTemplate`<p class="mt-4 text-[16px] italic text-hatch-fg-muted leading-relaxed">— ${post.excerpt} —</p>`}<div class="mt-6 flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-[12px] uppercase tracking-widest text-hatch-fg-subtle">${post.author && renderTemplate`<a${addAttribute(`/blog/author/${post.author.slug}`, "href")} class="flex items-center gap-2 hover:text-hatch-primary transition-colors">${post.author.avatar && renderTemplate`<img${addAttribute(post.author.avatar, "src")}${addAttribute(post.author.name, "alt")} width="22" height="22"${addAttribute(`${flags.avatarShape}`, "class")} loading="lazy">`}<span>By ${post.author.name}</span></a>`}${flags.showReadingTime && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<span>·</span><span>${flags.readingTimeText(post.readMinutes)}</span>` })}`}</div></header>${flags.showHeroImage && renderTemplate`<div class="aspect-[3/2] overflow-hidden mb-12 max-w-3xl mx-auto" style="border-top: 1px solid var(--hatch-fg); border-bottom: 1px solid var(--hatch-fg);">${renderComponent($$result, "HatchImage", $$HatchImage, {
		"src": post.featuredImage,
		"alt": post.title,
		"class": "w-full h-full object-cover",
		"width": 1200,
		"height": 800
	})}</div>`}${showSidebar && renderTemplate`<div class="max-w-2xl mx-auto mb-8 py-4 text-center" style="border-top: 1px dotted var(--hatch-fg); border-bottom: 1px dotted var(--hatch-fg);"><p class="text-[10px] uppercase tracking-[0.25em] text-hatch-fg-subtle mb-2">In this issue</p><nav class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] italic" aria-label="Table of Contents">${toc.map((item) => renderTemplate`<a${addAttribute(`#${item.id}`, "href")} class="text-hatch-fg-muted hover:text-hatch-primary transition-colors">${item.text}</a>`)}</nav></div>`}<div class="max-w-2xl mx-auto"><div class="hatch-prose"><div>${unescapeHTML(bodyHtml)}</div></div>${flags.showShare && renderTemplate`<div class="mt-12 pt-8 flex justify-center" style="border-top: 1px solid var(--hatch-fg);">${renderComponent($$result, "ShareRow", $$ShareRow, {
		"features": features,
		"title": post.title,
		"url": canonical
	})}</div>`}${flags.showAuthorBio && post.author?.description && renderTemplate`<div class="mt-12 pt-8 text-center" style="border-top: 1px solid var(--hatch-border);">${post.author.avatar && renderTemplate`<img${addAttribute(post.author.avatar, "src")}${addAttribute(post.author.name, "alt")} width="56" height="56"${addAttribute(`${flags.avatarShape} mx-auto mb-3`, "class")} loading="lazy">`}<a${addAttribute(`/blog/author/${post.author.slug}`, "href")} class="font-semibold text-hatch-fg hover:text-hatch-primary text-[15px]">${post.author.name}</a><p class="text-[14px] text-hatch-fg-muted mt-2 leading-relaxed max-w-md mx-auto italic">${post.author.description}</p></div>`}${flags.showPrevNext && (adjacent.prev || adjacent.next) && renderTemplate`<nav class="mt-12 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-center" style="border-top: 3px double var(--hatch-fg);" aria-label="Post navigation">${adjacent.prev && renderTemplate`<a${addAttribute(`/blog/${adjacent.prev.slug}`, "href")} class="group"><span class="text-[10px] uppercase tracking-widest text-hatch-fg-subtle">Previous Article</span><div class="mt-2 italic text-hatch-fg group-hover:text-hatch-primary transition-colors">${adjacent.prev.title}</div></a>`}${adjacent.next && renderTemplate`<a${addAttribute(`/blog/${adjacent.next.slug}`, "href")} class="group"><span class="text-[10px] uppercase tracking-widest text-hatch-fg-subtle">Next Article</span><div class="mt-2 italic text-hatch-fg group-hover:text-hatch-primary transition-colors">${adjacent.next.title}</div></a>`}</nav>`}${renderSlot($$result, $$slots["related"])}${renderSlot($$result, $$slots["comments"])}</div></article>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/theme/astropaper/Single.astro", void 0);
//#endregion
//#region src/components/theme/astrowind/Single.astro
createAstro("http://localhost:4321");
var $$Single$1 = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Single$1;
	const { post, features, toc, adjacent, dateLabel, updatedLabel, canonical, bodyHtml, flags } = Astro.props;
	const showSidebar = flags.sidebarSide !== "none" && toc.length > 0;
	return renderTemplate`${flags.showHeroImage && renderTemplate`${maybeRenderHead($$result)}<div class="relative aspect-[3/1] overflow-hidden bg-hatch-bg-3">${renderComponent($$result, "HatchImage", $$HatchImage, {
		"src": post.featuredImage,
		"alt": post.title,
		"class": "w-full h-full object-cover",
		"width": 1920,
		"height": 640
	})}<div class="absolute inset-0" style="background: linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--hatch-bg) 70%, transparent) 100%);"></div></div>`}<article class="mx-auto px-5 sm:px-8 py-10 sm:py-14" style="max-width: var(--hatch-max-width, 1160px);">${flags.showBreadcrumb && renderTemplate`<nav aria-label="Breadcrumb" class="flex items-center gap-2 text-[12.5px] text-hatch-fg-subtle mb-6 flex-wrap"><a href="/" class="hover:text-hatch-primary transition-colors">Home</a><span>${flags.breadcrumbSep}</span><a href="/blog" class="hover:text-hatch-primary transition-colors">Blog</a>${post.category && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<span>${flags.breadcrumbSep}</span><a${addAttribute(`/blog/category/${post.categorySlug}`, "href")} class="hover:text-hatch-primary transition-colors">${post.category}</a>` })}`}</nav>`}<header class="max-w-3xl mb-12">${post.category && renderTemplate`<a${addAttribute(`/blog/category/${post.categorySlug}`, "href")} class="inline-block px-3 py-1 rounded-full text-[12px] font-semibold mb-5 transition-opacity hover:opacity-80" style="background: color-mix(in srgb, var(--hatch-primary) 12%, transparent); color: var(--hatch-primary);">${post.category}</a>`}<h1 class="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]" style="font-family: var(--hatch-font-heading); letter-spacing: -0.025em;">${post.title}</h1>${post.excerpt && renderTemplate`<p class="mt-5 text-[18px] text-hatch-fg-muted leading-relaxed max-w-2xl">${post.excerpt}</p>`}<div class="mt-8 flex items-center flex-wrap gap-4 p-4 rounded-xl border border-hatch-border bg-hatch-bg-2">${post.author && renderTemplate`<a${addAttribute(`/blog/author/${post.author.slug}`, "href")} class="flex items-center gap-3 hover:text-hatch-primary transition-colors">${post.author.avatar && renderTemplate`<img${addAttribute(post.author.avatar, "src")}${addAttribute(post.author.name, "alt")} width="40" height="40"${addAttribute(`${flags.avatarShape}`, "class")} loading="lazy">`}<div><div class="font-semibold text-[14px] text-hatch-fg">${post.author.name}</div><div class="text-[12px] text-hatch-fg-subtle"><time${addAttribute(post.publishedAt, "datetime")}>${dateLabel}</time>${flags.showReadingTime && ` · ${flags.readingTimeText(post.readMinutes)}`}</div></div></a>`}</div>${flags.showUpdated && updatedLabel && renderTemplate`<p class="mt-3 text-[12.5px] text-hatch-fg-subtle">Last updated ${updatedLabel}</p>`}</header><div${addAttribute(`grid gap-x-12 gap-y-8 ${showSidebar ? flags.sidebarSide === "left" ? "lg:grid-cols-[260px_1fr]" : "lg:grid-cols-[1fr_260px]" : "grid-cols-1"}`, "class")}><div${addAttribute(`hatch-prose min-w-0 max-w-3xl ${flags.sidebarSide === "left" ? "lg:order-2" : "lg:order-1"}`, "class")}><div>${unescapeHTML(bodyHtml)}</div></div>${showSidebar && renderTemplate`<aside${addAttribute(`hidden lg:block ${flags.sidebarSide === "left" ? "lg:order-1" : "lg:order-2"}`, "class")}><div class="sticky top-20 p-5 rounded-xl border border-hatch-border bg-hatch-bg-2 max-h-[calc(100vh-7rem)] overflow-y-auto"><div class="text-[11px] font-bold uppercase tracking-widest mb-3" style="color: var(--hatch-primary);">${features.aesthetic.reading.toc_label}</div><nav class="flex flex-col gap-1.5 text-[13px]" aria-label="Table of Contents">${toc.map((item) => renderTemplate`<a${addAttribute(`#${item.id}`, "href")}${addAttribute(`hover:text-hatch-primary transition-colors text-hatch-fg-muted ${item.level === 3 ? "pl-3" : ""}`, "class")}>${item.text}</a>`)}</nav></div></aside>`}</div>${flags.showShare && renderTemplate`<div class="max-w-3xl mt-14 p-6 rounded-xl border border-hatch-border bg-hatch-bg-2"><div class="text-[13px] font-semibold text-hatch-fg mb-3">Found this useful? Share it.</div>${renderComponent($$result, "ShareRow", $$ShareRow, {
		"features": features,
		"title": post.title,
		"url": canonical
	})}</div>`}${flags.showAuthorBio && post.author?.description && renderTemplate`<div class="max-w-3xl mt-12 p-6 rounded-xl border border-hatch-border bg-hatch-bg-2 flex gap-5 items-start">${post.author.avatar && renderTemplate`<img${addAttribute(post.author.avatar, "src")}${addAttribute(post.author.name, "alt")} width="56" height="56"${addAttribute(`${flags.avatarShape} flex-shrink-0`, "class")} loading="lazy">`}<div class="min-w-0"><div class="text-[11px] uppercase tracking-widest font-semibold" style="color: var(--hatch-primary);">About the author</div><a${addAttribute(`/blog/author/${post.author.slug}`, "href")} class="font-bold text-hatch-fg hover:text-hatch-primary text-[16px]">${post.author.name}</a><p class="text-[14px] text-hatch-fg-muted mt-1.5 leading-relaxed">${post.author.description}</p></div></div>`}${flags.showPrevNext && (adjacent.prev || adjacent.next) && renderTemplate`<nav class="max-w-3xl mt-14 grid grid-cols-1 sm:grid-cols-2 gap-4" aria-label="Post navigation">${adjacent.prev && renderTemplate`<a${addAttribute(`/blog/${adjacent.prev.slug}`, "href")} class="group p-6 rounded-xl border border-hatch-border bg-hatch-bg-2 hover:border-hatch-primary transition-colors"><span class="text-[11px] uppercase tracking-widest font-semibold" style="color: var(--hatch-primary);">← Previous</span><div class="mt-2 text-[15px] font-semibold text-hatch-fg group-hover:text-hatch-primary line-clamp-2">${adjacent.prev.title}</div></a>`}${adjacent.next && renderTemplate`<a${addAttribute(`/blog/${adjacent.next.slug}`, "href")} class="group p-6 rounded-xl border border-hatch-border bg-hatch-bg-2 hover:border-hatch-primary transition-colors sm:text-right"><span class="text-[11px] uppercase tracking-widest font-semibold" style="color: var(--hatch-primary);">Next →</span><div class="mt-2 text-[15px] font-semibold text-hatch-fg group-hover:text-hatch-primary line-clamp-2">${adjacent.next.title}</div></a>`}</nav>`}${renderSlot($$result, $$slots["related"])}${renderSlot($$result, $$slots["comments"])}</article>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/theme/astrowind/Single.astro", void 0);
//#endregion
//#region src/components/theme/astronano/Single.astro
createAstro("http://localhost:4321");
var $$Single = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Single;
	const { post, features, toc, adjacent, dateLabel, updatedLabel, canonical, bodyHtml, flags } = Astro.props;
	const showSidebar = flags.sidebarSide !== "none" && toc.length > 0;
	return renderTemplate`${maybeRenderHead($$result)}<article class="mx-auto px-5 sm:px-8 py-10 sm:py-12" style="max-width: var(--hatch-max-width, 1160px);">${flags.showBreadcrumb && renderTemplate`<nav aria-label="Breadcrumb" class="text-[11.5px] text-hatch-fg-subtle mb-6 truncate"><a href="/blog" class="hover:text-hatch-fg transition-colors">blog</a>${post.category && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` ${flags.breadcrumbSep} <a${addAttribute(`/blog/category/${post.categorySlug}`, "href")} class="hover:text-hatch-fg transition-colors">${post.categorySlug}</a>` })}`}${" "}${flags.breadcrumbSep}${" "}<span class="text-hatch-fg-muted">${post.slug}</span></nav>`}<header class="mb-6"><h1 class="text-[26px] sm:text-[32px] font-medium tracking-tight leading-[1.2]" style="font-family: var(--hatch-font-heading);">${post.title}</h1><div class="mt-3 text-[12px] text-hatch-fg-subtle"><time${addAttribute(post.publishedAt, "datetime")}>${dateLabel}</time>${flags.showReadingTime && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` · ${flags.readingTimeText(post.readMinutes)}` })}`}${flags.showUpdated && updatedLabel && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` · updated ${updatedLabel}` })}`}</div></header>${flags.showHeroImage && renderTemplate`<div class="aspect-[2/1] overflow-hidden mb-8">${renderComponent($$result, "HatchImage", $$HatchImage, {
		"src": post.featuredImage,
		"alt": post.title,
		"class": "w-full h-full object-cover",
		"width": 1e3,
		"height": 500
	})}</div>`}${showSidebar && renderTemplate`<nav class="mb-6 pb-4 text-[12px]" aria-label="Table of Contents" style="border-bottom: 1px dashed var(--hatch-border);"><p class="text-[10.5px] uppercase tracking-wider text-hatch-fg-subtle mb-2">on this page</p><div class="flex flex-wrap gap-x-3 gap-y-1">${toc.map((item) => renderTemplate`<a${addAttribute(`#${item.id}`, "href")} class="text-hatch-fg-muted hover:text-hatch-fg transition-colors underline-offset-4 hover:underline">${item.text}</a>`)}</div></nav>`}<div class="hatch-prose"><div>${unescapeHTML(bodyHtml)}</div></div>${flags.showShare && renderTemplate`<div class="mt-10 pt-6" style="border-top: 1px dashed var(--hatch-border);">${renderComponent($$result, "ShareRow", $$ShareRow, {
		"features": features,
		"title": post.title,
		"url": canonical
	})}</div>`}${flags.showAuthorBio && post.author?.description && renderTemplate`<div class="mt-8 text-[13px] text-hatch-fg-muted"><a${addAttribute(`/blog/author/${post.author.slug}`, "href")} class="text-hatch-fg hover:text-hatch-primary">${post.author.name}</a> · ${post.author.description}</div>`}${flags.showPrevNext && (adjacent.prev || adjacent.next) && renderTemplate`<nav class="mt-10 pt-6 flex flex-wrap justify-between gap-3 text-[12px]" style="border-top: 1px dashed var(--hatch-border);" aria-label="Post navigation">${adjacent.prev ? renderTemplate`<a${addAttribute(`/blog/${adjacent.prev.slug}`, "href")} class="text-hatch-fg-muted hover:text-hatch-fg max-w-[45%] truncate">← ${adjacent.prev.title}</a>` : renderTemplate`<span></span>`}${adjacent.next ? renderTemplate`<a${addAttribute(`/blog/${adjacent.next.slug}`, "href")} class="text-hatch-fg-muted hover:text-hatch-fg max-w-[45%] truncate text-right">${adjacent.next.title} →</a>` : renderTemplate`<span></span>`}</nav>`}${renderSlot($$result, $$slots["related"])}${renderSlot($$result, $$slots["comments"])}</article>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/theme/astronano/Single.astro", void 0);
//#endregion
//#region src/pages/blog/[slug].astro
var _slug__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Slug,
	file: () => $$file,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$Slug = createComponent(async ($$result, $$props, $$slots) => {
	const Astro2 = $$result.createAstro($$props, $$slots);
	Astro2.self = $$Slug;
	const { slug } = Astro2.params;
	if (!slug) return Astro2.redirect("/blog");
	const post = await getPostBySlug(slug);
	if (!post) {
		Astro2.response.status = 404;
		return Astro2.rewrite("/404");
	}
	const features = await getFeatures();
	const aesthetic = features.aesthetic;
	const showProgress = hasFeature(features, "progress_bar");
	const showBreadcrumb = hasFeature(features, "breadcrumb");
	const showReadingTime = hasFeature(features, "reading_time") && aesthetic.reading.reading_time_label !== "hidden";
	const showUpdated = hasFeature(features, "last_updated");
	const showTOC = hasFeature(features, "toc_sidebar");
	const showShare = hasFeature(features, "sticky_share");
	const showAuthorBio = hasFeature(features, "author_bio");
	const showRelated = hasFeature(features, "related_posts");
	const showPrevNext = hasFeature(features, "next_prev_nav");
	const showComments = !!features?.content?.comments_enabled || !!features.integrations?.comments?.enabled;
	const share = aesthetic.share;
	const reading = aesthetic.reading;
	const images = aesthetic.images;
	const postNav = aesthetic.post_navigation;
	const breadcrumbSep = reading.breadcrumb_separator === "chevron" ? "›" : reading.breadcrumb_separator === "arrow" ? "→" : "/";
	const readingTimeText = (mins) => reading.reading_time_label === "mins" ? `${mins} mins` : `${mins} min read`;
	const avatarShape = reading.author_avatar_shape === "square" ? "rounded-none" : reading.author_avatar_shape === "rounded" ? "rounded-lg" : "rounded-full";
	const tocFiltered = (item) => reading.toc_depth === "h2" ? item.level === 2 : reading.toc_depth === "h2_h3" ? item.level <= 3 : true;
	reading.progress_bar_color;
	const progressPosition = reading.progress_bar_position === "bottom" ? "bottom-0" : "top-0";
	function formatDate(iso) {
		const d = new Date(iso);
		if (reading.date_format === "short") return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric"
		});
		if (reading.date_format === "relative") {
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
			month: "long",
			day: "numeric",
			year: "numeric"
		});
	}
	const SITE = features.site.url || "https://hatch-site.invalid";
	const canonical = `${SITE}/blog/${slug}`;
	const tmpl = features.design?.templates;
	const singleHero = tmpl?.single_hero ?? "featured";
	const singleSidebar = tmpl?.single_sidebar ?? "right";
	const singleWidth = tmpl?.single_width ?? "medium";
	const proseMaxCh = singleSidebar === "none" ? "none" : singleWidth === "narrow" ? "60ch" : singleWidth === "wide" ? "85ch" : "72ch";
	const articleMaxWStyle = "max-width: var(--hatch-max-width, 1160px);";
	const showHeroImage = singleHero !== "none" && !!post.featuredImage;
	const heroCompact = singleHero === "compact";
	const [rawHead, schema, adjacent, related, blockData] = await Promise.all([
		getSeoHead(slug),
		getSchema(canonical),
		showPrevNext ? getAdjacent(slug) : Promise.resolve({
			prev: null,
			next: null
		}),
		showRelated ? getRelatedPosts(post, postNav.related_count) : Promise.resolve([]),
		fetchPostBlocks(post.id)
	]);
	const toc = [];
	if (showTOC) {
		const matches = post.content.matchAll(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi);
		for (const m of matches) {
			const level = Number(m[1]);
			const inner = m[3].replace(/<[^>]+>/g, "").trim();
			if (!inner) continue;
			const id = inner.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
			toc.push({
				level,
				text: inner,
				id
			});
		}
	}
	const dateLabel = formatDate(post.publishedAt);
	const updatedDifferent = post.modifiedAt && post.publishedAt && new Date(post.modifiedAt).toDateString() !== new Date(post.publishedAt).toDateString();
	const updatedLabel = updatedDifferent ? formatDate(post.modifiedAt) : "";
	const gridClass = toc.length > 0 && singleSidebar !== "none" ? `grid gap-x-10 gap-y-8 ${singleSidebar === "left" ? "lg:grid-cols-[240px_1fr]" : "lg:grid-cols-[1fr_240px]"}` : "grid gap-x-10 gap-y-8 grid-cols-1";
	const shareText = encodeURIComponent(`${post.title} — ${SITE}/blog/${slug}`);
	const shareUrl = encodeURIComponent(`${SITE}/blog/${slug}`);
	const bodyHtml = blockData && blockData.blocks.length > 0 ? "" : post.content || "";
	const themeFlags = {
		showBreadcrumb,
		showReadingTime,
		showUpdated,
		showTOC,
		showShare,
		showAuthorBio,
		showRelated,
		showPrevNext,
		showComments,
		showHeroImage,
		heroCompact,
		sidebarSide: singleSidebar,
		breadcrumbSep,
		avatarShape,
		readingTimeText
	};
	const tk = themeKey(features);
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": post.title,
		"description": (post.seo?.description || post.excerpt || "").trim(),
		"canonical": canonical,
		"rawHead": rawHead,
		"ogImage": (() => {
			const img = (post.seo?.og_image || post.featuredImage || "").toString();
			return /^https?:\/\//i.test(img) ? img : void 0;
		})()
	}, { "default": async ($$result2) => renderTemplate`${renderComponent($$result2, "HatchSchema", $$HatchSchema, { "schema": schema })}${showProgress && tk !== "docs" && renderTemplate`${maybeRenderHead($$result2)}<div id="reading-progress"${addAttribute(`fixed ${progressPosition} left-0 h-1 z-50 origin-left scale-x-0 w-full transition-transform pointer-events-none`, "class")}${addAttribute(`transform-origin:left; background: var(--color-hatch-accent, var(--hatch-accent, #265e5a)); box-shadow: 0 1px 4px rgba(0,0,0,0.18); will-change: transform;`, "style")}></div>`}${tk === "tech" && renderTemplate`${renderComponent($$result2, "TechSingle", $$Single$4, {
		"post": post,
		"features": features,
		"toc": toc,
		"related": related,
		"adjacent": adjacent,
		"dateLabel": dateLabel,
		"updatedLabel": updatedLabel,
		"canonical": canonical,
		"bodyHtml": bodyHtml || post.content,
		"flags": themeFlags
	}, { "comments": ($$result3) => renderTemplate`${showComments && renderTemplate`${renderComponent($$result3, "HatchComments", $$HatchComments, {
		"slot": "comments",
		"features": features,
		"postId": post.id,
		"postTitle": post.title
	})}`}` })}`}${tk === "docs" && renderTemplate`${renderComponent($$result2, "DocsSingle", $$Single$3, {
		"post": post,
		"features": features,
		"toc": toc,
		"related": related,
		"adjacent": adjacent,
		"dateLabel": dateLabel,
		"updatedLabel": updatedLabel,
		"canonical": canonical,
		"bodyHtml": bodyHtml || post.content,
		"flags": themeFlags
	}, { "comments": ($$result3) => renderTemplate`${showComments && renderTemplate`${renderComponent($$result3, "HatchComments", $$HatchComments, {
		"slot": "comments",
		"features": features,
		"postId": post.id,
		"postTitle": post.title
	})}`}` })}`}${tk === "astropaper" && renderTemplate`${renderComponent($$result2, "AstroPaperSingle", $$Single$2, {
		"post": post,
		"features": features,
		"toc": toc,
		"related": related,
		"adjacent": adjacent,
		"dateLabel": dateLabel,
		"updatedLabel": updatedLabel,
		"canonical": canonical,
		"bodyHtml": bodyHtml || post.content,
		"flags": themeFlags
	}, { "comments": ($$result3) => renderTemplate`${showComments && renderTemplate`${renderComponent($$result3, "HatchComments", $$HatchComments, {
		"slot": "comments",
		"features": features,
		"postId": post.id,
		"postTitle": post.title
	})}`}` })}`}${tk === "astrowind" && renderTemplate`${renderComponent($$result2, "AstroWindSingle", $$Single$1, {
		"post": post,
		"features": features,
		"toc": toc,
		"related": related,
		"adjacent": adjacent,
		"dateLabel": dateLabel,
		"updatedLabel": updatedLabel,
		"canonical": canonical,
		"bodyHtml": bodyHtml || post.content,
		"flags": themeFlags
	}, { "comments": ($$result3) => renderTemplate`${showComments && renderTemplate`${renderComponent($$result3, "HatchComments", $$HatchComments, {
		"slot": "comments",
		"features": features,
		"postId": post.id,
		"postTitle": post.title
	})}`}` })}`}${tk === "astronano" && renderTemplate`${renderComponent($$result2, "AstroNanoSingle", $$Single, {
		"post": post,
		"features": features,
		"toc": toc,
		"related": related,
		"adjacent": adjacent,
		"dateLabel": dateLabel,
		"updatedLabel": updatedLabel,
		"canonical": canonical,
		"bodyHtml": bodyHtml || post.content,
		"flags": themeFlags
	}, { "comments": ($$result3) => renderTemplate`${showComments && renderTemplate`${renderComponent($$result3, "HatchComments", $$HatchComments, {
		"slot": "comments",
		"features": features,
		"postId": post.id,
		"postTitle": post.title
	})}`}` })}`}${tk === "blog" && renderTemplate`<article class="mx-auto px-5 sm:px-8 py-10 sm:py-14"${addAttribute(articleMaxWStyle, "style")}>${showBreadcrumb && renderTemplate`<nav aria-label="Breadcrumb" class="flex items-center gap-2 text-[13px] text-hatch-fg-subtle mb-8 flex-wrap"><a href="/" class="hover:text-hatch-fg transition-colors">Home</a><span class="text-hatch-fg-subtle">${breadcrumbSep}</span><a href="/blog" class="hover:text-hatch-fg transition-colors">Blog</a>${post.category && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": ($$result3) => renderTemplate`<span class="text-hatch-fg-subtle">${breadcrumbSep}</span><a${addAttribute(`/blog/category/${post.categorySlug}`, "href")} class="hover:text-hatch-fg transition-colors">${post.category}</a>` })}`}<span class="text-hatch-fg-subtle">${breadcrumbSep}</span><span class="text-hatch-fg truncate max-w-[260px] sm:max-w-none">${post.title}</span></nav>`}<header class="max-w-3xl mb-10">${post.category && renderTemplate`<a${addAttribute(`/blog/category/${post.categorySlug}`, "href")} class="inline-block text-[11px] uppercase tracking-wider font-medium text-hatch-primary mb-4 hover:underline">${post.category}</a>`}<h1 class="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]">${unescapeHTML(post.title)}</h1><div class="mt-6 flex items-center flex-wrap gap-x-4 gap-y-2 text-[14px] text-hatch-fg-muted">${post.author && renderTemplate`<a${addAttribute(`/blog/author/${post.author.slug}`, "href")} class="flex items-center gap-2 hover:text-hatch-fg transition-colors">${post.author.avatar && renderTemplate`<img${addAttribute(post.author.avatar, "src")} alt="" width="24" height="24"${addAttribute(avatarShape, "class")} loading="lazy">`}<span class="font-medium">${post.author.name}</span></a>`}<span class="text-hatch-fg-subtle">·</span><time${addAttribute(post.publishedAt, "datetime")}>${dateLabel}</time>${showReadingTime && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": ($$result3) => renderTemplate`<span class="text-hatch-fg-subtle">·</span><span>${readingTimeText(post.readMinutes)}</span>` })}`}</div>${showUpdated && updatedDifferent && renderTemplate`<p class="mt-2 text-[13px] text-hatch-fg-subtle italic">Last updated ${updatedLabel}</p>`}</header>${showHeroImage && renderTemplate`<div${addAttribute(`${heroCompact ? "aspect-[3/1]" : "aspect-[2/1]"} rounded-xl overflow-hidden bg-hatch-bg-3 mb-12 max-w-5xl`, "class")}>${renderComponent($$result2, "HatchImage", $$HatchImage, {
		"features": features,
		"src": post.featuredImage,
		"alt": post.featuredImageAlt ?? post.title,
		"width": 1600,
		"height": heroCompact ? 533 : 800,
		"loading": "eager",
		"class": "w-full h-full object-cover"
	})}</div>`}<div${addAttribute(gridClass, "class")}><div${addAttribute(`hatch-prose min-w-0 ${singleSidebar === "left" ? "lg:order-2" : "lg:order-1"}`, "class")}${addAttribute(`max-width: ${proseMaxCh};`, "style")}>${blockData && blockData.blocks.length > 0 ? renderTemplate`${renderComponent($$result2, "BlockRenderer", $$BlockRenderer, { "blocks": blockData.blocks })}` : renderTemplate`<div>${unescapeHTML(rewriteContentImages(post.content, features))}</div>`}</div>${toc.length > 0 && singleSidebar !== "none" && renderTemplate`<aside${addAttribute(`hidden lg:block ${singleSidebar === "left" ? "lg:order-1" : "lg:order-2"}`, "class")}><div class="sticky top-20 text-[13px]"><p class="text-[11px] uppercase tracking-wider font-medium text-hatch-fg-subtle mb-3">${reading.toc_label}</p><ul class="space-y-1.5 border-l border-hatch-border">${toc.filter(tocFiltered).map((item) => renderTemplate`<li><a${addAttribute(`#${item.id}`, "href")}${addAttribute(["-ml-px block py-1 pl-3 border-l border-transparent hover:border-hatch-fg hover:text-hatch-fg text-hatch-fg-muted transition-colors", item.level === 3 ? "pl-5" : ""], "class:list")}${addAttribute(item.id, "data-toc-id")}>${item.text}</a></li>`)}</ul></div></aside>`}</div>${post.tags.length > 0 && renderTemplate`<div class="flex flex-wrap items-center gap-2 pt-10 mt-12 border-t border-hatch-border">${post.tags.map((tag) => renderTemplate`<span class="px-3 py-1 rounded-full text-[13px] bg-hatch-bg-2 text-hatch-fg-muted border border-hatch-border">${tag}</span>`)}</div>`}${showShare && (share.x || share.linkedin || share.whatsapp || share.copy || share.facebook || share.reddit || share.email) && renderTemplate`<div${addAttribute(share.position === "sticky" ? "hidden lg:flex flex-col fixed left-6 top-1/2 -translate-y-1/2 gap-2 z-40" : "flex items-center gap-2 mt-8 pt-6 border-t border-hatch-border", "class")}>${share.position !== "sticky" && renderTemplate`<span class="text-[13px] text-hatch-fg-subtle mr-2">Share</span>`}${share.x && renderTemplate`<a${addAttribute(`https://twitter.com/intent/tweet?text=${shareText}`, "href")} target="_blank" rel="noopener noreferrer" aria-label="Share on X" title="Share on X" class="inline-flex items-center justify-center w-9 h-9 rounded-md border border-hatch-border text-hatch-fg-muted hover:text-hatch-fg hover:border-hatch-fg hover:bg-hatch-bg-2 transition-colors"><svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg></a>`}${share.linkedin && renderTemplate`<a${addAttribute(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, "href")} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" title="Share on LinkedIn" class="inline-flex items-center justify-center w-9 h-9 rounded-md border border-hatch-border text-hatch-fg-muted hover:text-hatch-fg hover:border-hatch-fg hover:bg-hatch-bg-2 transition-colors"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg></a>`}${share.whatsapp && renderTemplate`<a${addAttribute(`https://wa.me/?text=${shareText}`, "href")} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" title="Share on WhatsApp" class="inline-flex items-center justify-center w-9 h-9 rounded-md border border-hatch-border text-hatch-fg-muted hover:text-hatch-fg hover:border-hatch-fg hover:bg-hatch-bg-2 transition-colors"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"></path></svg></a>`}${share.facebook && renderTemplate`<a${addAttribute(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, "href")} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" title="Share on Facebook" class="inline-flex items-center justify-center w-9 h-9 rounded-md border border-hatch-border text-hatch-fg-muted hover:text-hatch-fg hover:border-hatch-fg hover:bg-hatch-bg-2 transition-colors"><svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path d="M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.03H7.9v-2.9h2.54V9.84c0-2.52 1.49-3.91 3.78-3.91 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.9h-2.33V22C18.34 21.25 22 17.09 22 12.07z"></path></svg></a>`}${share.reddit && renderTemplate`<a${addAttribute(`https://www.reddit.com/submit?url=${shareUrl}&title=${encodeURIComponent(post.title)}`, "href")} target="_blank" rel="noopener noreferrer" aria-label="Share on Reddit" title="Share on Reddit" class="inline-flex items-center justify-center w-9 h-9 rounded-md border border-hatch-border text-hatch-fg-muted hover:text-hatch-fg hover:border-hatch-fg hover:bg-hatch-bg-2 transition-colors"><svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12.5c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z"></path></svg></a>`}${share.email && renderTemplate`<a${addAttribute(`mailto:?subject=${encodeURIComponent(post.title)}&body=${shareText}`, "href")} aria-label="Share via Email" title="Share via Email" class="inline-flex items-center justify-center w-9 h-9 rounded-md border border-hatch-border text-hatch-fg-muted hover:text-hatch-fg hover:border-hatch-fg hover:bg-hatch-bg-2 transition-colors"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></a>`}${share.copy && renderTemplate`<button type="button" id="hatch-share-copy"${addAttribute(`${SITE}/blog/${slug}`, "data-url")} aria-label="Copy link" title="Copy link" class="inline-flex items-center justify-center w-9 h-9 rounded-md border border-hatch-border text-hatch-fg-muted hover:text-hatch-fg hover:border-hatch-fg hover:bg-hatch-bg-2 transition-colors"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>`}</div>`}${showAuthorBio && post.author?.description && renderTemplate`<div class="max-w-3xl mt-12 p-6 rounded-xl border border-hatch-border bg-hatch-bg-2 flex gap-4 items-start">${post.author.avatar && renderTemplate`<img${addAttribute(post.author.avatar, "src")}${addAttribute(post.author.name, "alt")} width="48" height="48"${addAttribute(`${avatarShape} flex-shrink-0`, "class")} loading="lazy">`}<div class="min-w-0"><a${addAttribute(`/blog/author/${post.author.slug}`, "href")} class="font-semibold text-hatch-fg hover:text-hatch-primary transition-colors">${post.author.name}</a><p class="text-[14px] text-hatch-fg-muted mt-1 leading-relaxed">${post.author.description}</p></div></div>`}${showPrevNext && (adjacent.prev || adjacent.next) && renderTemplate`<nav class="hatch-post-nav mt-14 pt-10 border-t border-hatch-border grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Post navigation">${adjacent.prev ? renderTemplate`<a${addAttribute(`/blog/${adjacent.prev.slug}`, "href")} rel="prev" class="hatch-post-nav__prev group p-4 rounded-lg border border-hatch-border hover:border-hatch-fg transition-colors"><span class="block text-[11px] uppercase tracking-wider text-hatch-fg-subtle mb-1">Previous</span><span class="block font-medium leading-snug line-clamp-2 group-hover:text-hatch-primary transition-colors">${unescapeHTML(adjacent.prev.title)}</span></a>` : renderTemplate`<div></div>`}${adjacent.next ? renderTemplate`<a${addAttribute(`/blog/${adjacent.next.slug}`, "href")} rel="next" class="hatch-post-nav__next group p-4 rounded-lg border border-hatch-border hover:border-hatch-fg transition-colors sm:text-right"><span class="block text-[11px] uppercase tracking-wider text-hatch-fg-subtle mb-1">Next</span><span class="block font-medium leading-snug line-clamp-2 group-hover:text-hatch-primary transition-colors">${unescapeHTML(adjacent.next.title)}</span></a>` : renderTemplate`<div></div>`}</nav>`}${showRelated && related.length > 0 && renderTemplate`<section class="mt-20 pt-12 border-t border-hatch-border"><h2 class="text-xl font-semibold tracking-tight mb-8">More in <span class="text-hatch-primary">${post.category}</span></h2><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-12">${related.map((entry) => renderTemplate`${renderComponent($$result2, "PostCard", $$PostCard, { "post": entry })}`)}</div></section>`}${showComments && renderTemplate`${renderComponent($$result2, "HatchComments", $$HatchComments, {
		"features": features,
		"postId": post.id,
		"postTitle": post.title
	})}`}</article>`}${images.lightbox && renderTemplate`<div id="hatch-lightbox" class="fixed inset-0 z-[60] hidden items-center justify-center bg-black/85 backdrop-blur-sm cursor-zoom-out" role="dialog" aria-modal="true" aria-label="Image preview"><button id="hatch-lightbox-close" type="button" aria-label="Close" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center transition-colors"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button><img id="hatch-lightbox-img" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="" class="max-w-[95vw] max-h-[90vh] object-contain rounded-md"></div>`}<script>(function(){${defineScriptVars({
		showProgress,
		tocIds: toc.map((t) => t.id),
		lightboxOn: images.lightbox,
		anchorsOn: reading.heading_anchors
	})}
    // v0.50.31 — Wrapped in a single init() so we can re-run on Astro
    // ClientRouter navigations. Previously the script only ran on a hard
    // refresh, so the lightbox + heading anchors + TOC IDs didn't bind
    // when arriving at a post via in-app navigation. Now: run on first
    // load AND on every \`astro:page-load\` event.
    function hatchInitPostScripts() {
    // Add id="..." to h2/h3 inside .hatch-prose so TOC anchor links work.
    (function() {
      const prose = document.querySelector('.hatch-prose');
      if (!prose) return;
      const headings = prose.querySelectorAll('h2, h3');
      let i = 0;
      headings.forEach((h) => {
        if (i < tocIds.length) { h.id = tocIds[i++]; }
      });
    })();

    if (showProgress) {
      const bar = document.getElementById('reading-progress');
      if (bar) {
        const onScroll = () => {
          const h = document.documentElement;
          const max = h.scrollHeight - h.clientHeight;
          const pct = max > 0 ? h.scrollTop / max : 0;
          bar.style.transform = \`scaleX(\${pct})\`;
        };
        addEventListener('scroll', onScroll, { passive: true });
        onScroll();
      }
    }

    const copyBtn = document.getElementById('hatch-share-copy');
    if (copyBtn) {
      const linkIcon = copyBtn.innerHTML;
      const checkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-green-600" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(copyBtn.dataset.url || location.href);
          copyBtn.innerHTML = checkIcon;
          copyBtn.setAttribute('aria-label', 'Copied');
          setTimeout(() => {
            copyBtn.innerHTML = linkIcon;
            copyBtn.setAttribute('aria-label', 'Copy link');
          }, 1500);
        } catch {}
      });
    }

    // Lightbox — wire all images inside .hatch-prose. Click image -> open
    // overlay with the full-resolution src. Esc + backdrop click close it.
    if (lightboxOn) {
      const lb = document.getElementById('hatch-lightbox');
      const lbImg = document.getElementById('hatch-lightbox-img');
      const lbClose = document.getElementById('hatch-lightbox-close');
      const open = (src, alt) => {
        if (!lb || !lbImg) return;
        lbImg.src = src; lbImg.alt = alt || '';
        lb.classList.remove('hidden');
        lb.classList.add('flex');
        document.body.style.overflow = 'hidden';
      };
      const close = () => {
        if (!lb) return;
        lb.classList.add('hidden');
        lb.classList.remove('flex');
        document.body.style.overflow = '';
      };
      document.querySelectorAll('.hatch-prose img').forEach((img) => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', () => open(img.currentSrc || img.src, img.alt));
      });
      if (lb) lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
      if (lbClose) lbClose.addEventListener('click', close);
      addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }

    // Heading anchor links — append a clickable # before each h2/h3 inside
    // .hatch-prose when reading.heading_anchors is on.
    if (anchorsOn) {
      document.querySelectorAll('.hatch-prose h2[id], .hatch-prose h3[id]').forEach((h) => {
        if (h.querySelector('a[data-hatch-anchor]')) return; // idempotent on re-init
        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = '#';
        a.setAttribute('aria-label', 'Permalink');
        a.setAttribute('data-hatch-anchor', '');
        a.className = 'ml-2 text-hatch-fg-subtle hover:text-hatch-primary opacity-0 group-hover:opacity-100 transition-opacity';
        h.classList.add('group');
        h.appendChild(a);
      });
    }
    }
    hatchInitPostScripts();
    document.addEventListener('astro:page-load', hatchInitPostScripts);
  })();<\/script>` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/blog/[slug].astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/blog/[slug].astro";
var $$url = "/blog/[slug]";
//#endregion
//#region \0virtual:astro:page:src/pages/blog/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };
