=== Hatch ===
Contributors: adityaarsharma
Tags: headless, cloudflare, rest-api, jamstack, astro
Requires at least: 6.4
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.7.6.1
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Run your site as a headless CMS. Hatch exposes clean REST data and deploys an Astro frontend to your own Cloudflare account from the dashboard.

== Description ==

Hatch turns your existing site into the back office of a fast, static-feeling frontend. You keep writing in the normal block editor. Hatch publishes your content over a purpose-built REST API and, with one Cloudflare API token, deploys a ready-made Astro frontend to Cloudflare Workers in your own Cloudflare account.

Everything runs inside your site. There is no Hatch server, no Hatch account and no Hatch-hosted deploy service. The plugin talks to Cloudflare directly, using a token you create and paste in.

**What you get**

* **Deploy to Cloudflare Workers from the dashboard.** Paste a Cloudflare API token, choose a workers.dev address or one of your own domains, and Hatch uploads the frontend, sets its secrets and reports the result. The token is stored encrypted and is never shown again.
* **Clean REST content API** under `hatch/v1`: posts, pages, menus, SEO fields, custom post types and block output.
* **Plugin Bridge.** If you already use an SEO plugin, a forms plugin, WooCommerce or Advanced Custom Fields, Hatch reads their data and passes it to the frontend. If a provider is not installed, Hatch says so.
* **Forms, comments and accounts** submitted from the frontend are handled by your site: form entries are stored in your database (see "Data Hatch stores"), comments go through normal WordPress moderation, and visitors can register and sign in with a WordPress account. Cloudflare Turnstile spam protection is optional.
* **Automatic cache refresh.** Publishing or updating content tells your frontend to refresh, using a shared secret.
* **Security hardening you can switch on or off**: lock down the public REST API, block XML-RPC, hide usernames, login lockout, security headers, and Turnstile on the login form.
* **Connection status.** A health view shows whether your frontend answers, when it last refreshed and what needs attention.

**Who it is for**

Site owners and agencies who want a Cloudflare-hosted frontend without running servers, and developers who want a stable, documented REST surface to build their own frontend against.

**Requirements for the deploy feature**

* A Cloudflare account (the free plan works for Workers).
* A Cloudflare API token with the permissions listed under Installation.
* A site that Cloudflare can reach over HTTPS. A site on a private network or `localhost` can still use the REST API, but the deployed frontend cannot read from it.

= External services =

Hatch contacts the services below. Each one is used only for the purpose stated, and only after you set it up.

**1. Cloudflare API (api.cloudflare.com)**

Used by the deploy feature. Nothing is sent until you paste a Cloudflare API token and press Deploy (or Verify token, or Remove).

* Data sent: your API token (as the Authorization header) and, to create the deployment, the frontend files, a script name, your site's REST address, and three Worker secrets: the username and an Application Password of the read-only Hatch Reader user (see "What Hatch changes on your site"), and the cache-refresh secret. If you choose your own domain, your zone and route settings are also sent. Cloudflare also receives your server's IP address, as with any web request.
* When: only while you run Verify token, Deploy, or the account and domain pickers in the setup screen.
* Terms: https://www.cloudflare.com/terms/ and https://www.cloudflare.com/website-terms/
* Privacy policy: https://www.cloudflare.com/privacypolicy/
* API documentation: https://developers.cloudflare.com/api/

**2. Cloudflare Turnstile (challenges.cloudflare.com)**

Optional spam protection for forms, comments and the login page. Off until you turn it on and enter your Turnstile keys.

* Data sent: the visitor's Turnstile response token and, when available, their IP address, together with your Turnstile secret key, from your server to `challenges.cloudflare.com/turnstile/v0/siteverify`. The visitor's browser also loads the Turnstile widget script from `challenges.cloudflare.com/turnstile/v0/api.js` on pages that show a protected form. Cloudflare requires this script to be loaded from Cloudflare.
* If Cloudflare cannot be reached, Hatch lets the request through rather than locking visitors out, and shows an admin notice.
* Terms: https://www.cloudflare.com/website-terms/
* Privacy policy: https://www.cloudflare.com/privacypolicy/
* Documentation: https://developers.cloudflare.com/turnstile/

**3. Your own frontend and webhook address**

After you save your frontend address in Hatch, your site sends requests to that address and nothing else: a periodic HEAD request to check that it is up, a cache-refresh request when content changes, and a test request when you press the test button. The cache-refresh secret is sent in a request header. You choose the address; it is normally the workers.dev or custom domain Hatch deployed to your own Cloudflare account.

**4. Google Fonts (fonts.googleapis.com and fonts.gstatic.com)**

Used by the frontend that Hatch deploys, not by the plugin on your WordPress site. The deployed pages load their web fonts from Google Fonts in each visitor's browser.

* Data sent: the visitor's browser requests the font files, so Google receives the visitor's IP address and browser details, as with any web request.
* When: on page views of the deployed frontend.
* Terms: https://developers.google.com/fonts/terms
* Privacy: https://developers.google.com/fonts/faq/privacy

**5. Optional services in the deployed frontend**

The frontend that Hatch uploads to your Cloudflare account can load the following only when you switch on the matching feature in the Hatch design and content settings. They run in your visitors' browsers from your own Worker, not from the plugin on your WordPress site.

* Google Tag Manager and Google Analytics (`googletagmanager.com`, `google-analytics.com`): analytics, only when you add a Tag Manager container ID in the Hatch settings. Privacy: https://policies.google.com/privacy
* Cloudflare Web Analytics (`static.cloudflareinsights.com`): Hatch adds no script of its own. If you turn Web Analytics on in your Cloudflare account, Cloudflare adds its beacon and the frontend's security policy allows it. Privacy: https://www.cloudflare.com/privacypolicy/
* Stripe (`js.stripe.com`) and PayPal (`paypal.com`): payment fields on the checkout page, only when you switch on that gateway in WooCommerce and add its public key. Privacy: https://stripe.com/privacy and https://www.paypal.com/privacy
* Partytown from `cdn.jsdelivr.net`: moves analytics scripts off the main thread, only when you switch on the Partytown performance option. Privacy: https://www.jsdelivr.com/terms/privacy-policy-jsdelivr-net

In every case the visitor's browser sends its IP address and browser details to that provider, as with any web request.

**Not contacted:** Hatch does not send usage statistics, does not check a Hatch server for updates and has no tracking of any kind. Plugin updates come from WordPress.org.

= Source code =

The full source of everything in this plugin, including the compiled parts, is public at https://github.com/eticastudio/hatch and the source for the compiled frontend is also inside this plugin, in the `source` folder. The plugin has two compiled parts.

* Admin screen (`build/admin`). The readable source is in `admin-react/src` inside this plugin, together with `package.json` and `package-lock.json`. To rebuild it, install the packages with npm and run `npm run build` in the plugin folder. It uses `@wordpress/scripts`.
* Frontend that Hatch uploads to your Cloudflare account (`frontend-bundle`). Its source is the Astro project in `source/astro-starter`. To rebuild it, install Node.js 22.12 or newer and, from the `source` folder, run `PLUGIN_FILE="$PWD/../hatch.php" OUT="$PWD/../frontend-bundle" bash scripts/build-frontend-bundle.sh`. The build uses fixed placeholder addresses, and Hatch replaces them with your own addresses when it deploys.

Third-party components and their licences are listed in `THIRD-PARTY.txt` inside the plugin.

== Installation ==

1. Upload the plugin through Plugins, Add New, Upload Plugin, or install it from the Plugins directory. Activate it.
2. Open Hatch in the admin menu and follow the setup screen.
3. Create a Cloudflare API token at https://dash.cloudflare.com/profile/api-tokens with these permissions:
   * Account, Workers Scripts, Edit (required)
   * Account, Account Settings, Read (recommended, lets Hatch list your accounts)
   * Zone, Zone, Read and Zone, Workers Routes, Edit (only if you want your own domain instead of a workers.dev address)
4. Paste the token into the setup screen and choose Verify token, then Deploy.

= What Hatch changes on your site =

* **Consent first.** A deploy does not start until you tick a box that lists the changes below.
* **Hatch Reader user.** The deploy creates a WordPress user named "Hatch Reader" with a dedicated read-only role, `hatch_reader`, and one Application Password for it. The frontend signs in as that user to read your content. It cannot edit, publish or manage anything. Disconnect (Hatch, Connection) deletes the user and revokes the password, provided Hatch created the user.
* **Sign-in for frontend visitors.** The frontend can offer login and registration through the `hatch/v1/auth` routes. They use signed tokens (JWT, valid 24 hours), a per-IP rate limit and a honeypot field on registration. Logging out, or changing a password, ends all earlier sessions for that user. Sessions issued by versions before 0.7.6.1 are no longer valid, so signed-in visitors log in once more after the update.
* **Companion theme.** After a successful deploy, Hatch installs a small blank theme named Hatch Companion into `wp-content/themes/` and switches to it. It keeps WordPress working as the back office and redirects visitors of the raw WordPress address to your frontend. You can switch back at any time under Appearance, Themes.
* **Permalinks.** If your site uses plain permalinks, a successful deploy changes them to `/%postname%/` so the REST API and frontend URLs work. Sites that already use pretty permalinks are left alone.
* **Application password.** The Application Password is named "Hatch (Cloudflare deploy)". It is given to your Worker as an encrypted secret and belongs to the Hatch Reader user, so it carries read-only permissions. Earlier passwords with that name are revoked after a new deploy succeeds. You can review and revoke it under Users, Hatch Reader, at any time.
* **Uploads folder rules.** Hardening adds a clearly marked block to `uploads/.htaccess` on servers that use Apache. It is removed on uninstall.
* **Scheduled checks.** A 15-minute check of your own frontend address, only after you have saved one.

= Data Hatch stores =

* **Form submissions.** When a visitor submits a form through the frontend, Hatch stores the field values, the form and provider name, the visitor's IP address and browser user agent in the table `wp_hatch_form_submissions` (your table prefix may differ). Entries older than 90 days are deleted automatically, at most once a day. Change the period with the `hatch_form_retention_days` filter, or return 0 to keep entries. Hatch has no personal-data export or erasure tool for this table yet, so to answer a data request delete the matching rows from the table.
* **Comments** are stored as normal WordPress comments.
* **Login attempts.** The frontend sign-in rate limit and the optional login lockout keep short-lived counters per IP address in transients.

= Uninstalling =

Deleting the plugin always removes: the encrypted Cloudflare token, the webhook and cache-refresh secrets, the Turnstile secret key, deploy and connection state, Hatch scheduled events, temporary data, the marked block in `uploads/.htaccess`, Application Passwords created by Hatch and the Hatch Reader user and role, when Hatch created them.

Your settings, design choices, form submissions and the submissions table are kept unless you tick "Remove all data on uninstall" in the Hatch settings before deleting the plugin.

The Worker deployed in your Cloudflare account is not touched. Remove it in the Cloudflare dashboard under Workers & Pages.

== Frequently Asked Questions ==

= Do I need to pay for Cloudflare? =

The free Cloudflare plan includes Workers. Cloudflare sets the limits and prices; see https://developers.cloudflare.com/workers/platform/limits/. Hatch itself has no fees.

= Does Hatch see my Cloudflare token? =

Your token stays on your own server. It is encrypted before it is saved, sent only to Cloudflare, never returned to your browser and never written to logs. Hatch has no server of its own to receive it. Delete it at any time with Remove token, or by uninstalling the plugin.

= What permissions does the token need? =

Account, Workers Scripts, Edit is required. Account Settings, Read is optional. Zone Read and Workers Routes Edit are needed only for a custom domain. Use a token limited to one account and, for a custom domain, one zone.

= Can I deploy somewhere other than Cloudflare? =

Not in this version. The deploy code is split behind a provider interface so more hosts can be added later. The REST API works with any frontend you build.

= Do I have to use the Astro frontend? =

No. The `hatch/v1` REST API is frontend-agnostic. The Astro frontend is the one Hatch can deploy for you.

= Do I need custom blocks? =

No. Write with the standard block editor. Hatch reads what you write over REST.

= Will it work with my SEO, forms or shop plugin? =

Hatch reads RankMath and Yoast SEO, Fluent Forms, WPForms, Contact Form 7 and Gravity Forms, WooCommerce, and Advanced Custom Fields when they are active. If none is installed, the matching features stay off.

= My site is on localhost or behind a firewall. Can I deploy? =

You can verify your token and deploy, but the deployed frontend runs on Cloudflare's network and must be able to reach your site over HTTPS. Use a public address or a tunnel.

= Is my data sent anywhere without my consent? =

No. Every external request is listed under External services and starts only after you enter the relevant token, key or address.

= Why do the permalinks and theme change? =

See "What Hatch changes on your site". Both changes are made by a successful deploy that an administrator started.

== Changelog ==

= 0.7.6.1 =
* Deploys to Cloudflare Workers directly from your site with a token you supply. The token is stored encrypted.
* Removed the hosted deploy service, the VPS agent, the Netlify and Vercel deploy paths and the plugin's own updater. Updates come from WordPress.org.
* Removed all outbound telemetry and the phone-home connection check.
* Cloudflare errors now say what went wrong: invalid token, missing permission, rate limit, Cloudflare outage, or an unreadable reply.
* Turnstile is checked with a short timeout and fails open, so a Cloudflare outage cannot lock you out.
* Removed the AI helper and the Blocks tab from this release. The block editor works as normal.
* The Application Password over plain HTTP override now applies to local development sites only.
* Clearer uninstall: secrets and connection state are always removed, settings and submissions are kept unless you opt in to remove them.
* Hardening writes to `uploads/.htaccess` inside a marked block instead of overwriting the file.
* The login form stays at the standard `/wp-login.php` address. Hatch does not move or hide it.
* Added a read-only Hatch Reader user and role for the frontend, replacing use of the administrator's account. Disconnect removes it.
* Deploy now needs your explicit consent before it changes the theme, permalinks or creates the Application Password.
* Frontend sign-in: tokens are tied to the user's password and are revoked on logout or password change. Sessions from earlier versions are invalidated.
* Comments and store product routes no longer return draft, private, password-protected or withheld items, and comment replies must belong to the same post.
* When "Hide usernames" is on, author slugs in Hatch responses no longer reveal the login name.
* The locked REST API keeps the public frontend routes (`auth`, `store`, `design`, `integrations`) reachable for signed-out visitors.
* Form submissions older than 90 days are deleted automatically.
* The frontend source now ships inside the plugin, in the `source` folder.
* Code standards: WordPress Coding Standards (WordPress-Extra) clean and escaped output. Every route that changes data is protected by a capability check, a nonce or a signed token, or is a public form, comment or login route with its own spam and lockout controls.

== Upgrade Notice ==

= 0.7.6.1 =
Deploys now run inside your site with your own Cloudflare token. The hosted deploy service, VPS agent, Netlify and Vercel paths are removed. Redeploy from the setup screen after updating. Signed-in frontend visitors will need to log in again.
