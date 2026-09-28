globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { n as getFeatures } from "./features_Ccz4SEbt.mjs";
import { c as getPosts, n as getCategories, o as getPages } from "./hatch_it4n8Llv.mjs";
//#region src/pages/sitemap-index.xml.ts
var sitemap_index_xml_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = async () => {
	const [features, postsData, pages, categories] = await Promise.all([
		getFeatures(),
		getPosts({
			page: 1,
			perPage: 100
		}),
		getPages(),
		getCategories()
	]);
	const site = (features.site.url || "https://hatch-site.invalid").replace(/\/$/, "");
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const urls = [{
		loc: `${site}/`,
		lastmod: now,
		changefreq: "daily",
		priority: "1.0"
	}, {
		loc: `${site}/blog`,
		lastmod: now,
		changefreq: "daily",
		priority: "0.9"
	}];
	for (const p of postsData.posts) urls.push({
		loc: `${site}/blog/${p.slug}`,
		lastmod: new Date(p.modifiedAt || p.publishedAt).toISOString(),
		changefreq: "weekly",
		priority: "0.8"
	});
	for (const page of pages) urls.push({
		loc: `${site}/${page.slug}`,
		lastmod: new Date(page.modifiedAt || page.publishedAt).toISOString(),
		changefreq: "monthly",
		priority: "0.7"
	});
	for (const cat of categories) {
		if (cat.count === 0) continue;
		urls.push({
			loc: `${site}/blog/category/${cat.slug}`,
			lastmod: now,
			changefreq: "weekly",
			priority: "0.5"
		});
	}
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
	return new Response(xml, {
		status: 200,
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=86400"
		}
	});
};
//#endregion
//#region \0virtual:astro:page:src/pages/sitemap-index.xml@_@ts
var page = () => sitemap_index_xml_exports;
//#endregion
export { page };
