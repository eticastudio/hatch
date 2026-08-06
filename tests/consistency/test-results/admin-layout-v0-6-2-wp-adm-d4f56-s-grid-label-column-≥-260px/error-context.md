# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-layout.spec.ts >> v0.6.2 wp-admin HxRow grid layout >> every HxRow across every tab uses grid + label column ≥ 260px
- Location: admin-layout.spec.ts:29:3

# Error details

```
Error: Bridge: no grid HxRow should collapse below 260px (found 13)

expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 13
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - navigation "Main menu":
    - link "Skip to main content" [ref=e3] [cursor=pointer]:
      - /url: "#wpbody-content"
    - link "Skip to toolbar" [ref=e4] [cursor=pointer]:
      - /url: "#wp-toolbar"
    - list [ref=e7]:
      - listitem [ref=e8]:
        - link "Dashboard" [ref=e9] [cursor=pointer]:
          - /url: index.php
          - generic [ref=e10]: 
          - generic [ref=e11]: Dashboard
        - list [ref=e12]:
          - listitem [ref=e13]:
            - link "Home" [ref=e14] [cursor=pointer]:
              - /url: index.php
          - listitem [ref=e15]:
            - link "Updates 9" [ref=e16] [cursor=pointer]:
              - /url: update-core.php
              - text: Updates
              - generic [ref=e17]: "9"
      - listitem [ref=e18]:
        - link "Hatch" [ref=e19] [cursor=pointer]:
          - /url: admin.php?page=hatch
          - generic [ref=e21]: Hatch
      - listitem [ref=e22]
      - listitem [ref=e24]:
        - link "Posts" [ref=e25] [cursor=pointer]:
          - /url: edit.php
          - generic [ref=e26]: 
          - generic [ref=e27]: Posts
        - list [ref=e28]:
          - listitem [ref=e29]:
            - link "All Posts" [ref=e30] [cursor=pointer]:
              - /url: edit.php
          - listitem [ref=e31]:
            - link "Add Post" [ref=e32] [cursor=pointer]:
              - /url: post-new.php
          - listitem [ref=e33]:
            - link "Categories" [ref=e34] [cursor=pointer]:
              - /url: edit-tags.php?taxonomy=category
          - listitem [ref=e35]:
            - link "Tags" [ref=e36] [cursor=pointer]:
              - /url: edit-tags.php?taxonomy=post_tag
      - listitem [ref=e37]:
        - link "Media" [ref=e38] [cursor=pointer]:
          - /url: upload.php
          - generic [ref=e39]: 
          - generic [ref=e40]: Media
        - list [ref=e41]:
          - listitem [ref=e42]:
            - link "Library" [ref=e43] [cursor=pointer]:
              - /url: upload.php
          - listitem [ref=e44]:
            - link "Add Media File" [ref=e45] [cursor=pointer]:
              - /url: media-new.php
      - listitem [ref=e46]:
        - link "Pages" [ref=e47] [cursor=pointer]:
          - /url: edit.php?post_type=page
          - generic [ref=e48]: 
          - generic [ref=e49]: Pages
        - list [ref=e50]:
          - listitem [ref=e51]:
            - link "All Pages" [ref=e52] [cursor=pointer]:
              - /url: edit.php?post_type=page
          - listitem [ref=e53]:
            - link "Add Page" [ref=e54] [cursor=pointer]:
              - /url: post-new.php?post_type=page
      - listitem [ref=e55]:
        - link "Comments" [ref=e56] [cursor=pointer]:
          - /url: edit-comments.php
          - generic [ref=e57]: 
          - generic [ref=e58]: Comments
      - listitem [ref=e59]:
        - link "Fluent Forms" [ref=e60] [cursor=pointer]:
          - /url: admin.php?page=fluent_forms
          - generic [ref=e62]: Fluent Forms
        - list [ref=e63]:
          - listitem [ref=e64]:
            - link "Forms" [ref=e65] [cursor=pointer]:
              - /url: admin.php?page=fluent_forms
          - listitem [ref=e66]:
            - link "New Form" [ref=e67] [cursor=pointer]:
              - /url: admin.php?page=fluent_forms#add=1
          - listitem [ref=e68]:
            - link "Entries" [ref=e69] [cursor=pointer]:
              - /url: admin.php?page=fluent_forms_all_entries
          - listitem [ref=e70]:
            - link "Reports" [ref=e71] [cursor=pointer]:
              - /url: admin.php?page=fluent_forms_reports
          - listitem [ref=e72]:
            - link "Global Settings" [ref=e73] [cursor=pointer]:
              - /url: admin.php?page=fluent_forms_settings
          - listitem [ref=e74]:
            - link "Tools" [ref=e75] [cursor=pointer]:
              - /url: admin.php?page=fluent_forms_transfer
          - listitem [ref=e76]:
            - link "Integrations" [ref=e77] [cursor=pointer]:
              - /url: admin.php?page=fluent_forms_add_ons
          - listitem [ref=e78]:
            - link "Support" [ref=e79] [cursor=pointer]:
              - /url: admin.php?page=fluent_forms_docs
      - listitem [ref=e80]:
        - link "WPForms" [ref=e81] [cursor=pointer]:
          - /url: admin.php?page=wpforms-overview
          - generic [ref=e83]: WPForms
        - list [ref=e84]:
          - listitem [ref=e85]:
            - link "All Forms" [ref=e86] [cursor=pointer]:
              - /url: admin.php?page=wpforms-overview
          - listitem [ref=e87]:
            - link "Add New Form" [ref=e88] [cursor=pointer]:
              - /url: admin.php?page=wpforms-builder
          - listitem [ref=e89]:
            - link "Entries" [ref=e90] [cursor=pointer]:
              - /url: admin.php?page=wpforms-entries
          - listitem [ref=e91]:
            - link "Payments NEW!" [ref=e92] [cursor=pointer]:
              - /url: admin.php?page=wpforms-payments
              - text: Payments
              - generic [ref=e93]: NEW!
          - listitem [ref=e94]:
            - link "Form Templates" [ref=e95] [cursor=pointer]:
              - /url: admin.php?page=wpforms-templates
          - listitem [ref=e96]:
            - link "Settings" [ref=e97] [cursor=pointer]:
              - /url: admin.php?page=wpforms-settings
          - listitem [ref=e98]:
            - link "Tools" [ref=e99] [cursor=pointer]:
              - /url: admin.php?page=wpforms-tools
          - listitem [ref=e100]:
            - link "Addons" [ref=e101] [cursor=pointer]:
              - /url: admin.php?page=wpforms-addons
          - listitem [ref=e102]:
            - link "Privacy Compliance" [ref=e103] [cursor=pointer]:
              - /url: admin.php?page=wpforms-wpconsent
          - listitem [ref=e104]:
            - link "SMTP" [ref=e105] [cursor=pointer]:
              - /url: admin.php?page=wpforms-smtp
          - listitem [ref=e106]:
            - link "About Us" [ref=e107] [cursor=pointer]:
              - /url: admin.php?page=wpforms-about
          - listitem [ref=e108]:
            - link "Community" [ref=e109] [cursor=pointer]:
              - /url: admin.php?page=wpforms-community
          - listitem [ref=e110]:
            - link "Upgrade to Pro" [ref=e111] [cursor=pointer]:
              - /url: https://wpforms.com/lite-upgrade/?utm_campaign=liteplugin&utm_source=WordPress&utm_medium=admin-menu&utm_locale=en_US&utm_content=Upgrade%20to%20Pro%20-%20toplevel_page_hatch
      - listitem [ref=e112]
      - listitem [ref=e114]:
        - link "Appearance" [ref=e115] [cursor=pointer]:
          - /url: themes.php
          - generic [ref=e116]: 
          - generic [ref=e117]: Appearance
        - list [ref=e118]:
          - listitem [ref=e119]:
            - link "Themes" [ref=e120] [cursor=pointer]:
              - /url: themes.php
          - listitem [ref=e121]:
            - link "Design" [ref=e122] [cursor=pointer]:
              - /url: site-editor.php
          - listitem [ref=e123]:
            - link "Fonts" [ref=e124] [cursor=pointer]:
              - /url: font-library.php
          - listitem [ref=e125]:
            - link "Customize" [ref=e126] [cursor=pointer]:
              - /url: customize.php?return=%2Fwp-admin%2Fadmin.php%3Fpage%3Dhatch
          - listitem [ref=e127]:
            - link "Menus" [ref=e128] [cursor=pointer]:
              - /url: nav-menus.php
      - listitem [ref=e129]:
        - link "Plugins 8" [ref=e130] [cursor=pointer]:
          - /url: plugins.php
          - generic [ref=e131]: 
          - generic [ref=e132]:
            - text: Plugins
            - generic [ref=e133]: "8"
        - list [ref=e134]:
          - listitem [ref=e135]:
            - link "Installed Plugins" [ref=e136] [cursor=pointer]:
              - /url: plugins.php
          - listitem [ref=e137]:
            - link "Add Plugin" [ref=e138] [cursor=pointer]:
              - /url: plugin-install.php
      - listitem [ref=e139]:
        - link "Users" [ref=e140] [cursor=pointer]:
          - /url: users.php
          - generic [ref=e141]: 
          - generic [ref=e142]: Users
        - list [ref=e143]:
          - listitem [ref=e144]:
            - link "All Users" [ref=e145] [cursor=pointer]:
              - /url: users.php
          - listitem [ref=e146]:
            - link "Add User" [ref=e147] [cursor=pointer]:
              - /url: user-new.php
          - listitem [ref=e148]:
            - link "Profile" [ref=e149] [cursor=pointer]:
              - /url: profile.php
      - listitem [ref=e150]:
        - link "Tools" [ref=e151] [cursor=pointer]:
          - /url: tools.php
          - generic [ref=e152]: 
          - generic [ref=e153]: Tools
        - list [ref=e154]:
          - listitem [ref=e155]:
            - link "Available Tools" [ref=e156] [cursor=pointer]:
              - /url: tools.php
          - listitem [ref=e157]:
            - link "Import" [ref=e158] [cursor=pointer]:
              - /url: import.php
          - listitem [ref=e159]:
            - link "Export" [ref=e160] [cursor=pointer]:
              - /url: export.php
          - listitem [ref=e161]:
            - link "Site Health" [ref=e162] [cursor=pointer]:
              - /url: site-health.php
          - listitem [ref=e163]:
            - link "Export Personal Data" [ref=e164] [cursor=pointer]:
              - /url: export-personal-data.php
          - listitem [ref=e165]:
            - link "Erase Personal Data" [ref=e166] [cursor=pointer]:
              - /url: erase-personal-data.php
          - listitem [ref=e167]:
            - link "Redirection" [ref=e168] [cursor=pointer]:
              - /url: tools.php?page=redirection.php
          - listitem [ref=e169]:
            - link "Yoast Redirects" [ref=e170] [cursor=pointer]:
              - /url: tools.php?page=wpseo_redirects_tools
      - listitem [ref=e171]:
        - link "Settings" [ref=e172] [cursor=pointer]:
          - /url: options-general.php
          - generic [ref=e173]: 
          - generic [ref=e174]: Settings
        - list [ref=e175]:
          - listitem [ref=e176]:
            - link "General" [ref=e177] [cursor=pointer]:
              - /url: options-general.php
          - listitem [ref=e178]:
            - link "Connectors" [ref=e179] [cursor=pointer]:
              - /url: options-connectors.php
          - listitem [ref=e180]:
            - link "Writing" [ref=e181] [cursor=pointer]:
              - /url: options-writing.php
          - listitem [ref=e182]:
            - link "Reading" [ref=e183] [cursor=pointer]:
              - /url: options-reading.php
          - listitem [ref=e184]:
            - link "Discussion" [ref=e185] [cursor=pointer]:
              - /url: options-discussion.php
          - listitem [ref=e186]:
            - link "Media" [ref=e187] [cursor=pointer]:
              - /url: options-media.php
          - listitem [ref=e188]:
            - link "Permalinks" [ref=e189] [cursor=pointer]:
              - /url: options-permalink.php
          - listitem [ref=e190]:
            - link "Privacy" [ref=e191] [cursor=pointer]:
              - /url: options-privacy.php
      - listitem [ref=e192]
      - listitem [ref=e194]:
        - link "Yoast SEO 2 notifications" [ref=e195] [cursor=pointer]:
          - /url: admin.php?page=wpseo_dashboard
          - generic [ref=e197]:
            - text: Yoast SEO
            - generic [ref=e198]:
              - text: "2"
              - generic [ref=e199]: 2 notifications
        - list [ref=e200]:
          - listitem [ref=e201]:
            - link "General" [ref=e202] [cursor=pointer]:
              - /url: admin.php?page=wpseo_dashboard
          - listitem [ref=e203]:
            - link "Settings" [ref=e204] [cursor=pointer]:
              - /url: admin.php?page=wpseo_page_settings
          - listitem [ref=e205]:
            - link "Integrations" [ref=e206] [cursor=pointer]:
              - /url: admin.php?page=wpseo_integrations
          - listitem [ref=e207]:
            - link "Tools" [ref=e208] [cursor=pointer]:
              - /url: admin.php?page=wpseo_tools
          - listitem [ref=e209]:
            - link "Academy" [ref=e210] [cursor=pointer]:
              - /url: admin.php?page=wpseo_page_academy
          - listitem [ref=e211]:
            - link "Plans" [ref=e212] [cursor=pointer]:
              - /url: admin.php?page=wpseo_licenses
          - listitem [ref=e213]:
            - link "Workouts Premium" [ref=e214] [cursor=pointer]:
              - /url: admin.php?page=wpseo_workouts
              - text: Workouts
              - generic [ref=e215]: Premium
          - listitem [ref=e216]:
            - link "Redirects Premium" [ref=e217] [cursor=pointer]:
              - /url: admin.php?page=wpseo_redirects
              - text: Redirects
              - generic [ref=e218]: Premium
          - listitem [ref=e219]:
            - link "Support" [ref=e220] [cursor=pointer]:
              - /url: admin.php?page=wpseo_page_support
          - listitem [ref=e221]:
            - link "Upgrade" [ref=e222] [cursor=pointer]:
              - /url: admin.php?page=wpseo_upgrade_sidebar
              - generic [ref=e224]: Upgrade
          - listitem [ref=e225]:
            - link "AI Brand Insights" [ref=e226] [cursor=pointer]:
              - /url: admin.php?page=wpseo_brand_insights
              - generic [ref=e228]: AI Brand Insights
      - listitem [ref=e230]:
        - link "Rank Math SEO" [ref=e231] [cursor=pointer]:
          - /url: admin.php?page=rank-math-registration
          - generic [ref=e232]: 
          - generic [ref=e233]: Rank Math SEO
      - listitem [ref=e234]:
        - button "Collapse Main menu" [expanded] [ref=e235] [cursor=pointer]:
          - generic [ref=e237]: Collapse Menu
  - generic [ref=e238]:
    - generic [ref=e239]:
      - navigation "Toolbar":
        - menu:
          - group [ref=e240]:
            - menuitem "About WordPress" [ref=e241] [cursor=pointer]:
              - generic [ref=e243]: About WordPress
          - group [ref=e244]:
            - menuitem "Hatch" [ref=e245] [cursor=pointer]
          - group [ref=e246]:
            - menuitem "9 updates available" [ref=e247] [cursor=pointer]:
              - generic [ref=e249]: "9"
              - generic [ref=e250]: 9 updates available
          - group [ref=e251]:
            - menuitem "Ctrl+K Open command palette" [ref=e252] [cursor=pointer]:
              - generic [ref=e254]:
                - text: Ctrl+K
                - generic [ref=e255]: Open command palette
          - group [ref=e256]:
            - menuitem "0 Comments in moderation" [ref=e257] [cursor=pointer]:
              - generic [ref=e259]: "0"
              - generic [ref=e260]: 0 Comments in moderation
          - group [ref=e261]:
            - menuitem "New" [ref=e262] [cursor=pointer]:
              - generic [ref=e264]: New
          - group [ref=e265]:
            - menuitem "SEO 2 notifications" [ref=e266] [cursor=pointer]:
              - generic [ref=e268]: SEO
              - generic [ref=e269]:
                - text: "2"
                - generic [ref=e270]: 2 notifications
            - text: Premium Premium
          - group [ref=e271]:
            - menuitem "Fluent Forms 3" [ref=e272] [cursor=pointer]:
              - text: Fluent Forms
              - generic [ref=e273]: "3"
          - group [ref=e274]:
            - menuitem "WPForms" [ref=e275] [cursor=pointer]
        - menu [ref=e276]:
          - group [ref=e277]:
            - menuitem "Howdy, admin" [ref=e278] [cursor=pointer]
    - main [ref=e279]:
      - generic [ref=e280]:
        - generic [ref=e281]:
          - link "WordPress 7.0.2" [ref=e282] [cursor=pointer]:
            - /url: https://wordpress.org/documentation/wordpress-version/version-7-0-2/
          - text: is available!
          - link "Please update WordPress now" [ref=e283] [cursor=pointer]:
            - /url: http://localhost:8810/wp-admin/update-core.php
            - text: Please update now
          - text: .
        - generic [ref=e286]:
          - generic [ref=e287]:
            - img "🐣" [ref=e289]
            - heading "Hatch" [level=1] [ref=e290]
            - paragraph [ref=e292]:
              - strong [ref=e293]: "Action Scheduler:"
              - text: "3"
              - link "past-due actions" [ref=e294] [cursor=pointer]:
                - /url: http://localhost:8810/wp-admin/tools.php?page=action-scheduler&status=past-due&order=asc
              - text: found; something may be wrong.
              - link "Read documentation »" [ref=e295] [cursor=pointer]:
                - /url: https://actionscheduler.org/faq/#my-site-has-past-due-actions-what-can-i-do
            - generic [ref=e296]:
              - text: Please complete your
              - link "Redirection setup" [ref=e297] [cursor=pointer]:
                - /url: http://localhost:8810/wp-admin/tools.php?page=redirection.php
              - text: to activate the plugin.
            - paragraph [ref=e298]: The Headless Engine for WordPress
            - generic [ref=e299]:
              - generic [ref=e300]: v0.7.1
              - link "GitHub" [ref=e301] [cursor=pointer]:
                - /url: https://github.com/adityaarsharma/hatch
                - img [ref=e302]
                - text: GitHub
              - link "Docs" [ref=e304] [cursor=pointer]:
                - /url: https://github.com/adityaarsharma/hatch/tree/main/docs
                - img [ref=e305]
                - text: Docs
          - generic [ref=e309]:
            - button "Connection" [ref=e310] [cursor=pointer]
            - button "Design" [ref=e311] [cursor=pointer]
            - button "Content" [ref=e312] [cursor=pointer]
            - button "Bridge" [ref=e313] [cursor=pointer]
            - button "Performance" [ref=e314] [cursor=pointer]
            - button "Security" [ref=e315] [cursor=pointer]
            - button "Status" [ref=e316] [cursor=pointer]
          - generic [ref=e320]:
            - generic [ref=e321]:
              - img [ref=e323]
              - generic [ref=e325]:
                - generic [ref=e326]: Diagnostic
                - generic [ref=e327]: Read-only snapshot of every flag, credential, and cron Hatch is currently using. The one place to answer “where does this come from?” without leaving the dashboard.
            - generic [ref=e328]:
              - generic [ref=e329]: Frontline Live Site
              - generic [ref=e330]:
                - generic [ref=e331]: hatch_frontend_url
                - generic [ref=e332]: http://localhost:4321
              - generic [ref=e333]:
                - generic [ref=e334]: hatch_image_proxy_url
                - generic [ref=e335]: "off"
              - generic [ref=e336]:
                - generic [ref=e337]: hatch_hosting_model
                - generic [ref=e338]: vps
            - generic [ref=e339]:
              - generic [ref=e340]: Authentication
              - generic [ref=e341]:
                - generic [ref=e342]: Webhook secret set
                - generic [ref=e343]: "off"
            - generic [ref=e344]:
              - generic [ref=e345]: Security
              - generic [ref=e346]:
                - generic [ref=e347]: REST API hardening
                - generic [ref=e348]: "on"
              - generic [ref=e349]:
                - generic [ref=e350]: XML-RPC disabled
                - generic [ref=e351]: "on"
              - generic [ref=e352]:
                - generic [ref=e353]: User enum blocked
                - generic [ref=e354]: "on"
              - generic [ref=e355]:
                - generic [ref=e356]: Site noindex
                - generic [ref=e357]: "on"
            - generic [ref=e358]:
              - generic [ref=e359]: Plugin
              - generic [ref=e360]:
                - generic [ref=e361]: Hatch version
                - generic [ref=e362]: 0.7.1
              - generic [ref=e363]:
                - generic [ref=e364]: WordPress
                - generic [ref=e365]: 7.0.1
              - generic [ref=e366]:
                - generic [ref=e367]: PHP
                - generic [ref=e368]: 8.3.31
            - generic [ref=e369]:
              - generic [ref=e370]: Bridges
              - generic [ref=e371]:
                - generic [ref=e372]: Plugin providers detected
                - generic [ref=e373]: 3 / 12
              - generic [ref=e374]:
                - generic [ref=e375]: Companion theme active
                - generic [ref=e376]: "on"
            - generic [ref=e377]:
              - generic [ref=e378]: Sync
              - generic [ref=e379]:
                - generic [ref=e380]: Last frontend revalidation
                - generic [ref=e381]: 60 minutes ago
              - generic [ref=e382]:
                - generic [ref=e383]: WP cron
                - generic [ref=e384]: wp-cron.php
              - generic [ref=e385]:
                - generic [ref=e386]: Auto-revalidate on publish
                - generic [ref=e387]: "on"
          - generic [ref=e388]:
            - generic [ref=e389]:
              - link "GitHub" [ref=e390] [cursor=pointer]:
                - /url: https://github.com/adityaarsharma/hatch
              - link "Docs" [ref=e391] [cursor=pointer]:
                - /url: https://github.com/adityaarsharma/hatch/tree/main/docs
              - link "Run setup wizard again" [ref=e392] [cursor=pointer]:
                - /url: http://localhost:8810/wp-admin/admin.php?page=hatch-setup
              - link "Need help with setup?" [ref=e393] [cursor=pointer]:
                - /url: https://adityaarsharma.com/connect
            - generic [ref=e394]: Hatch v0.7.1 · MIT licensed
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | import { mkdirSync } from 'node:fs';
  3   | 
  4   | /**
  5   |  * v0.6.2 — Admin layout regression suite.
  6   |  *
  7   |  * Locks in the HxRow grid contract: every row across every tab
  8   |  * splits label:content ~3:2, description column stays wider than
  9   |  * 260px, no visual collapse. Runs against the wp-admin Hatch panel
  10  |  * with a real login, screenshots each tab, and asserts geometry.
  11  |  */
  12  | 
  13  | const SS_DIR = 'test-results/admin-layout';
  14  | mkdirSync(SS_DIR, { recursive: true });
  15  | 
  16  | async function login(page: Page) {
  17  |   await page.goto('http://localhost:8810/wp-login.php', { waitUntil: 'domcontentloaded' });
  18  |   await page.fill('#user_login', 'admin');
  19  |   await page.fill('#user_pass', 'hatchadmin');
  20  |   await Promise.all([
  21  |     page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
  22  |     page.click('#wp-submit'),
  23  |   ]);
  24  | }
  25  | 
  26  | const TABS = ['Connection', 'Design', 'Content', 'Bridge', 'Performance', 'Security', 'Status'];
  27  | 
  28  | test.describe.serial('v0.6.2 wp-admin HxRow grid layout', () => {
  29  |   test('every HxRow across every tab uses grid + label column ≥ 260px', async ({ page }) => {
  30  |     await page.setViewportSize({ width: 1440, height: 900 });
  31  |     await login(page);
  32  |     await page.goto('http://localhost:8810/wp-admin/admin.php?page=hatch', { waitUntil: 'networkidle' });
  33  | 
  34  |     const perTab: Record<string, any> = {};
  35  | 
  36  |     for (const tab of TABS) {
  37  |       await page.evaluate((t) => {
  38  |         const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === t) as HTMLButtonElement | undefined;
  39  |         btn?.click();
  40  |       }, tab);
  41  |       await page.waitForTimeout(500);
  42  |       await page.screenshot({ path: `${SS_DIR}/tab-${tab.toLowerCase()}.png`, fullPage: true });
  43  | 
  44  |       const measurements = await page.evaluate(() => {
  45  |         const labels = [...document.querySelectorAll('.hx-label')] as HTMLElement[];
  46  |         const rows = labels.map((l) => l.parentElement?.parentElement).filter(Boolean) as HTMLElement[];
  47  |         return rows.map((r) => {
  48  |           const cs = getComputedStyle(r);
  49  |           const left = r.children[0] as HTMLElement;
  50  |           const right = r.children[1] as HTMLElement;
  51  |           return {
  52  |             display: cs.display,
  53  |             gridCols: cs.gridTemplateColumns,
  54  |             leftW: Math.round(left?.getBoundingClientRect().width ?? 0),
  55  |             rightW: Math.round(right?.getBoundingClientRect().width ?? 0),
  56  |             label: (left?.querySelector('.hx-label')?.textContent || '').trim().slice(0, 40),
  57  |             descW: Math.round(left?.querySelector('.hx-desc')?.getBoundingClientRect().width ?? 0),
  58  |           };
  59  |         });
  60  |       });
  61  | 
  62  |       perTab[tab] = measurements;
  63  |       console.log(`\n  ${tab} — ${measurements.length} rows`);
  64  |       const badRows = measurements.filter((r) => r.display !== 'grid');
  65  |       const narrowRows = measurements.filter((r) => r.leftW > 0 && r.leftW < 260);
  66  |       if (badRows.length) console.log(`    ⚠  ${badRows.length} rows not on grid`);
  67  |       if (narrowRows.length) console.log(`    ⚠  ${narrowRows.length} rows with label column < 260px`);
  68  |       // Sample first 2 rows so we can spot-check
  69  |       for (const m of measurements.slice(0, 2)) {
  70  |         console.log(`    row "${m.label.padEnd(30)}"  L=${m.leftW}px R=${m.rightW}px  desc=${m.descW}px`);
  71  |       }
  72  |     }
  73  | 
  74  |     // Assertions — grid HxRows must never collapse below 260px on the label side
  75  |     for (const [tab, rows] of Object.entries(perTab)) {
  76  |       const arr = rows as any[];
  77  |       if (arr.length === 0) continue;
  78  |       const gridRows = arr.filter((r) => r.display === 'grid');
  79  |       const collapsed = gridRows.filter((r) => r.descW > 0 && r.leftW < 260);
> 80  |       expect(collapsed.length, `${tab}: no grid HxRow should collapse below 260px (found ${collapsed.length})`).toBe(0);
      |                                                                                                                 ^ Error: Bridge: no grid HxRow should collapse below 260px (found 13)
  81  |       // 90%+ of rows on any tab should be grid-based (allow a few custom layouts)
  82  |       const gridRatio = gridRows.length / arr.length;
  83  |       expect(gridRatio, `${tab}: ≥90% of rows must use grid (got ${(gridRatio * 100).toFixed(0)}%)`).toBeGreaterThanOrEqual(0.9);
  84  |     }
  85  |   });
  86  | 
  87  |   test('Bridge tab specifically — SEO card with 5 badges keeps layout clean', async ({ page }) => {
  88  |     await page.setViewportSize({ width: 1440, height: 900 });
  89  |     await login(page);
  90  |     await page.goto('http://localhost:8810/wp-admin/admin.php?page=hatch#bridges', { waitUntil: 'networkidle' });
  91  |     await page.evaluate(() => {
  92  |       const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Bridge') as HTMLButtonElement | undefined;
  93  |       btn?.click();
  94  |       const seo = [...document.querySelectorAll('*')].find((el) => (el.textContent || '').trim().startsWith('🔍 SEO'));
  95  |       seo?.scrollIntoView({ block: 'start', behavior: 'instant' });
  96  |     });
  97  |     await page.waitForTimeout(600);
  98  |     await page.screenshot({ path: `${SS_DIR}/bridge-seo-card.png`, fullPage: false });
  99  | 
  100 |     const seoRow = await page.evaluate(() => {
  101 |       const labels = [...document.querySelectorAll('.hx-label')] as HTMLElement[];
  102 |       const supportedPlugins = labels.find((l) => l.textContent === 'Supported plugins');
  103 |       if (!supportedPlugins) return null;
  104 |       const left = supportedPlugins.parentElement as HTMLElement;
  105 |       const right = left?.parentElement?.children[1] as HTMLElement;
  106 |       return {
  107 |         leftW: Math.round(left?.getBoundingClientRect().width ?? 0),
  108 |         rightW: Math.round(right?.getBoundingClientRect().width ?? 0),
  109 |         descLines: left?.querySelector('.hx-desc')?.getBoundingClientRect().height ?? 0,
  110 |         rightChildren: right?.children.length ?? 0,
  111 |       };
  112 |     });
  113 | 
  114 |     console.log(`\n  SEO "Supported plugins" row: L=${seoRow?.leftW}px  R=${seoRow?.rightW}px  desc height=${seoRow?.descLines}px  badges=${seoRow?.rightChildren}`);
  115 |     expect(seoRow, 'Supported plugins row must exist').not.toBeNull();
  116 |     expect(seoRow!.leftW, 'left column ≥ 260px').toBeGreaterThanOrEqual(260);
  117 |     expect(seoRow!.descLines, 'description ≤ 4 lines (each ~24px)').toBeLessThan(100);
  118 |   });
  119 | });
  120 | 
```