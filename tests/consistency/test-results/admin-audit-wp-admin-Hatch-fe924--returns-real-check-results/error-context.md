# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> wp-admin Hatch dashboard audit >> Connection tab — Preflight diagnostic returns real check results
- Location: admin-audit.spec.ts:139:3

# Error details

```
Error: diagnostic endpoint must be reachable when authenticated

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
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
            - button "Connection" [active] [ref=e310] [cursor=pointer]
            - button "Design" [ref=e311] [cursor=pointer]
            - button "Content" [ref=e312] [cursor=pointer]
            - button "Bridge" [ref=e313] [cursor=pointer]
            - button "Performance" [ref=e314] [cursor=pointer]
            - button "Security" [ref=e315] [cursor=pointer]
            - button "Status" [ref=e316] [cursor=pointer]
          - generic [ref=e319]:
            - generic [ref=e320]:
              - generic [ref=e321]:
                - img [ref=e323]
                - generic [ref=e326]:
                  - generic [ref=e327]: Frontline is live
                  - generic [ref=e328]: Saves invalidate the frontend cache in about 60 seconds. No redeploy needed.
              - generic [ref=e329]:
                - generic [ref=e330]:
                  - generic [ref=e331]: Frontend URL
                  - generic [ref=e332]: Where visitors land. Click Edit to change without re-running the wizard.
                - generic [ref=e334]:
                  - link "localhost:4321" [ref=e335] [cursor=pointer]:
                    - /url: http://localhost:4321
                    - text: localhost:4321
                    - img [ref=e336]
                  - button "Edit" [ref=e340] [cursor=pointer]
              - generic [ref=e341]:
                - generic [ref=e342]:
                  - generic [ref=e343]: Heartbeat
                  - generic [ref=e344]: No heartbeat yet. First probe runs within 5 minutes.
                - generic [ref=e346]:
                  - img [ref=e347]
                  - generic [ref=e349]: Pending
                  - button "Probe now" [ref=e351] [cursor=pointer]
              - generic [ref=e352]:
                - generic [ref=e353]:
                  - generic [ref=e354]: Host
                  - generic [ref=e355]: Where your Astro build runs. Change via the setup wizard.
                - generic [ref=e357]:
                  - generic [ref=e358]: Your VPS
                  - button "Change" [ref=e359] [cursor=pointer]
              - generic [ref=e360]:
                - link "Visit live site" [ref=e361] [cursor=pointer]:
                  - /url: http://localhost:4321
                  - img [ref=e362]
                  - text: Visit live site
                - button "View Status" [ref=e366] [cursor=pointer]:
                  - img [ref=e367]
                  - text: View Status
                - button "Redeploy" [ref=e369] [cursor=pointer]:
                  - img [ref=e370]
                  - text: Redeploy
            - generic [ref=e375]:
              - img [ref=e377]
              - generic [ref=e379]:
                - generic [ref=e380]: Companion theme
                - generic [ref=e381]: Active. Visitors to this WordPress URL 302-redirect to your Astro frontend automatically.
              - generic [ref=e382]: Active
            - generic [ref=e384] [cursor=pointer]:
              - generic [ref=e386]:
                - img [ref=e388]
                - generic [ref=e390]:
                  - generic [ref=e391]: Preflight diagnostic
                  - generic [ref=e392]: 1 suggestion. Connection works, items below polish the deploy.
              - generic [ref=e393]:
                - generic [ref=e394]: 10 / 11
                - img [ref=e395]
          - generic [ref=e397]:
            - generic [ref=e398]:
              - link "GitHub" [ref=e399] [cursor=pointer]:
                - /url: https://github.com/adityaarsharma/hatch
              - link "Docs" [ref=e400] [cursor=pointer]:
                - /url: https://github.com/adityaarsharma/hatch/tree/main/docs
              - link "Run setup wizard again" [ref=e401] [cursor=pointer]:
                - /url: http://localhost:8810/wp-admin/admin.php?page=hatch-setup
              - link "Need help with setup?" [ref=e402] [cursor=pointer]:
                - /url: https://adityaarsharma.com/connect
            - generic [ref=e403]: Hatch v0.7.1 · MIT licensed
```

# Test source

```ts
  66  |       const buttons = [...document.querySelectorAll('button, [role="tab"], a[href*="#"]')];
  67  |       return buttons
  68  |         .filter((b) => {
  69  |           const t = (b.textContent || '').trim();
  70  |           return /^(Overview|Design|Content|Bridge|Diagnostics|Connection|Blocks|Onboarding)$/i.test(t);
  71  |         })
  72  |         .map((b) => ({ text: (b.textContent || '').trim() }));
  73  |     });
  74  | 
  75  |     console.log(`\n  discovered tabs: ${tabs.map((t) => t.text).join(', ')}`);
  76  |     expect(tabs.length, 'must discover at least 3 admin tabs').toBeGreaterThanOrEqual(3);
  77  | 
  78  |     const report: Array<{ tab: string; visibleContent: number; verdict: string; notes: string[] }> = [];
  79  | 
  80  |     for (const tab of tabs) {
  81  |       // Click tab
  82  |       await page.click(`button:has-text("${tab.text}"), [role="tab"]:has-text("${tab.text}")`, { timeout: 5000 }).catch(() => {});
  83  |       await page.waitForTimeout(600);
  84  | 
  85  |       // Signals per tab: how much visible text is on screen? Any "coming soon" / "unknown" fills?
  86  |       const signals = await page.evaluate(() => {
  87  |         const root = document.getElementById('hatch-react-root');
  88  |         const text = (root?.textContent || '').trim();
  89  |         return {
  90  |           visibleTextLen: text.length,
  91  |           hasComingSoon: /coming soon|not yet|placeholder|todo/i.test(text),
  92  |           hasUnknown: /unknown/i.test(text),
  93  |           hasSaveBtn: !!root?.querySelector('button')?.textContent?.match(/Save|Apply/i),
  94  |         };
  95  |       });
  96  | 
  97  |       const notes: string[] = [];
  98  |       let verdict = 'ok';
  99  |       if (signals.visibleTextLen < 200) { verdict = 'thin'; notes.push('very little content'); }
  100 |       if (signals.hasComingSoon) { verdict = 'stub'; notes.push('contains "coming soon" text'); }
  101 |       if (signals.hasUnknown && tab.text !== 'Connection') { notes.push('shows "unknown" state'); }
  102 | 
  103 |       await page.screenshot({ path: `${OUT}/tab-${tab.text.toLowerCase().replace(/[^a-z]/g, '-')}.png`, fullPage: true });
  104 |       report.push({ tab: tab.text, visibleContent: signals.visibleTextLen, verdict, notes });
  105 |       console.log(`  ${verdict.padEnd(5)} ${tab.text.padEnd(14)} chars=${signals.visibleTextLen}  ${notes.join(', ')}`);
  106 |     }
  107 | 
  108 |     // Summary
  109 |     const bad = report.filter((r) => r.verdict !== 'ok');
  110 |     console.log(`\n  summary: ${report.length - bad.length}/${report.length} tabs ok · ${bad.length} need attention`);
  111 |     expect(errors.length, `no console errors while walking tabs (found: ${errors.slice(0, 3).join(' | ')})`).toBeLessThanOrEqual(2);
  112 |   });
  113 | 
  114 |   test('Design tab — save Primary color round-trips through REST', async ({ page }) => {
  115 |     await login(page);
  116 |     await page.goto(ADMIN_URL, { waitUntil: 'networkidle' });
  117 |     await page.click('button:has-text("Design"), [role="tab"]:has-text("Design")').catch(() => {});
  118 |     await page.waitForTimeout(600);
  119 |     await page.screenshot({ path: `${OUT}/design-tab.png`, fullPage: true });
  120 | 
  121 |     // Find the primary color input and try to change it
  122 |     const hasColorInput = await page.evaluate(() => {
  123 |       const inputs = [...document.querySelectorAll('input[type="color"], input[type="text"]')];
  124 |       return inputs.some((i) => (i as HTMLInputElement).value?.startsWith('#'));
  125 |     });
  126 |     console.log(`\n  Design tab has a color input: ${hasColorInput}`);
  127 | 
  128 |     // Read what /features endpoint currently returns for brand.primary
  129 |     const primaryFromApi = await page.evaluate(async () => {
  130 |       const r = await fetch('/wp-json/hatch/v1/features');
  131 |       const d = await r.json();
  132 |       return d?.design?.brand?.primary;
  133 |     });
  134 |     console.log(`  Current brand.primary via API: ${primaryFromApi}`);
  135 | 
  136 |     expect(primaryFromApi, 'features API must return a brand.primary hex').toMatch(/^#[0-9a-fA-F]{6}$/);
  137 |   });
  138 | 
  139 |   test('Connection tab — Preflight diagnostic returns real check results', async ({ page }) => {
  140 |     await login(page);
  141 |     await page.goto(ADMIN_URL, { waitUntil: 'networkidle' });
  142 |     await page.click('button:has-text("Connection"), [role="tab"]:has-text("Connection")').catch(() => {});
  143 |     await page.waitForTimeout(1200);
  144 | 
  145 |     // Call the diagnostic endpoint DIRECTLY (server-side, with auth cookies)
  146 |     const diag = await page.evaluate(async () => {
  147 |       const r = await fetch('/wp-json/hatch/v1/diagnostic');
  148 |       const d = await r.json();
  149 |       return {
  150 |         ok: r.ok,
  151 |         status: r.status,
  152 |         keys: Object.keys(d).slice(0, 20),
  153 |         checksCount: (d?.checks?.length ?? d?.items?.length ?? 0),
  154 |         passCount: [...(d?.checks || d?.items || [])].filter((c: any) => c.status === 'ok' || c.pass === true).length,
  155 |         raw: JSON.stringify(d).slice(0, 300),
  156 |       };
  157 |     });
  158 |     console.log(`\n  /diagnostic endpoint: HTTP ${diag.status}`);
  159 |     console.log(`  response keys: ${diag.keys.join(', ')}`);
  160 |     console.log(`  total checks: ${diag.checksCount}`);
  161 |     console.log(`  passing: ${diag.passCount}`);
  162 |     console.log(`  raw: ${diag.raw}`);
  163 | 
  164 |     await page.screenshot({ path: `${OUT}/connection-tab.png`, fullPage: true });
  165 | 
> 166 |     expect(diag.ok, 'diagnostic endpoint must be reachable when authenticated').toBe(true);
      |                                                                                 ^ Error: diagnostic endpoint must be reachable when authenticated
  167 |     expect(diag.checksCount, 'diagnostic must return at least 1 check').toBeGreaterThan(0);
  168 |   });
  169 | });
  170 | 
```