globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
//#region src/pages/sitemap.xml.ts
var sitemap_xml_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
/**
* /sitemap.xml — 301 redirect to the canonical /sitemap-index.xml.
* Most crawlers (Google/Bing/DuckDuckGo) hit /sitemap.xml by default; without
* this, they get a 404 (see v0.5.7 SEO story). Aliasing to the real sitemap
* keeps the URL surface clean without duplicating the generator.
*/
var GET = ({ redirect }) => redirect("/sitemap-index.xml", 301);
//#endregion
//#region \0virtual:astro:page:src/pages/sitemap.xml@_@ts
var page = () => sitemap_xml_exports;
//#endregion
export { page };
