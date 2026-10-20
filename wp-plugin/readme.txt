=== Hatch Connect ===
Contributors: hmbhq, adityaarsharma
Tags: headless, cloudflare, astro, jamstack, rest-api
Requires at least: 6.4
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.2
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Deploy a fast headless frontend for WordPress to your own Cloudflare account from your dashboard in minutes. No servers to run.

== Description ==

**Headless WordPress on Cloudflare, set up from your dashboard.** Hatch gives your site a fast, modern frontend (the website your visitors see) that runs on Cloudflare. You keep writing in WordPress with the normal block editor, and WordPress stays your back office. Hatch uploads the frontend to your own Cloudflare account for you, using a Cloudflare token (a long password) that you create and paste in.

"Headless" simply means the part visitors see and the part you write in are separate. WordPress keeps your posts, pages, menus and settings. A small Astro-built site on Cloudflare shows them to visitors.

Everything runs inside your site. There is no Hatch server, no Hatch account and no Hatch-hosted deploy service. The plugin talks to Cloudflare directly.

**How it works**

1. Install and activate Hatch. A short setup guide opens.
2. Create a Cloudflare token with the permissions the guide lists, and paste it in.
3. Choose a free workers.dev address or one of your own domains, read the list of changes, and press Deploy.

Nothing on your site or in your Cloudflare account changes until you press Deploy. You can undo it later with the Disconnect button.

**What you get**

* **One-click deploy to Cloudflare from the dashboard.** Hatch uploads the frontend as a Cloudflare Worker (a small program that runs your site on Cloudflare's network), sets it up and shows you the live address. The token is stored encrypted and is never shown again.
* **Content for your frontend.** Posts, pages, menus, search data, custom post types and block output are shared through the WordPress REST API (the standard way sites share data with apps), under the `hatch/v1` address.
* **Plugin connections.** If you already use an SEO plugin, a forms plugin, WooCommerce or Advanced Custom Fields, Hatch reads their data and passes it to the frontend. If none is installed, the matching feature stays off.
* **Forms, comments and accounts** sent from the frontend are handled by your site: form entries are stored in your database (see "Data Hatch stores"), comments go through normal WordPress moderation, and, if you switch on Frontend accounts, visitors can sign in with a WordPress account (and register, when WordPress's "Anyone can register" setting is on). Cloudflare Turnstile spam protection is optional.
* **Automatic refresh.** Publishing or updating content tells your frontend to show the change.
* **Security protections you can switch on or off**: lock down the public WordPress data feed, close the old XML-RPC door, hide usernames, lock out repeated wrong passwords, add browser safety headers, and use Turnstile on the sign-in form.
* **Connection check.** One screen shows whether your frontend is answering, when it last refreshed and what needs attention.

**Who it is for**

Site owners and agencies who want a fast frontend on Cloudflare without running servers, and developers who want a stable, documented REST API to build their own frontend against.

**What you need**

* A Cloudflare account. The free plan works for Workers.
* A Cloudflare token with the permissions listed under Installation.
* A site that is online and uses https, so Cloudflare can reach it. A site on a private network or `localhost` can still use the REST API, but the deployed frontend cannot read from it.

= External services =

Hatch contacts the services below. Each one is used only for the purpose stated, and only after you set it up.

**1. Cloudflare API (api.cloudflare.com)**

Used by the deploy feature. Nothing is sent until you paste a Cloudflare API token and press Deploy (or Check token).

* Data sent: your API token (as the Authorization header) and, to create the deployment, the frontend files, a script name, your site's REST address, and three Worker secrets: the user name and Application Password of the low-privilege account you chose for the frontend (see "What Hatch changes on your site"), and the cache-refresh secret. If you choose your own domain, your zone and route settings are also sent. Cloudflare also receives your server's IP address, as with any web request.
* When: only while you run Check token, Deploy or Redeploy, or use the account and domain pickers in the setup guide.
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

In every case the visitor's browser sends its IP address and browser details to that provider, as with any web request.

**Not contacted:** Hatch does not send usage statistics, does not check a Hatch server for updates and has no tracking of any kind. The optional "Measure real visitor speed" switch writes page load timings to your own Worker's log; nothing goes to Hatch or anyone else. Plugin updates come from WordPress.org.

= Source code =

The full source of everything in this plugin, including the compiled parts, is public at https://github.com/eticastudio/hatch. The plugin has two compiled parts.

* Admin screen (`build/admin`). The readable source is in `admin-react/src` inside this plugin, together with `package.json` and `package-lock.json`. To rebuild it, install the packages with npm and run `npm run build` in the plugin folder. It uses `@wordpress/scripts`.
* Frontend that Hatch uploads to your Cloudflare account (`frontend-bundle`). Its source is the Astro project in the `astro-starter` folder of https://github.com/eticastudio/hatch. To rebuild it, install Node.js 22.12 or newer, clone that repository and, from its root, run `PLUGIN_FILE="/path/to/hatch-connect/hatch.php" OUT="/path/to/hatch-connect/frontend-bundle" bash scripts/build-frontend-bundle.sh`. The build uses fixed placeholder addresses, and Hatch replaces them with your own addresses when it deploys.

Third-party components and their licences are listed in `THIRD-PARTY.txt` inside the plugin.

== Installation ==

1. Upload the plugin through Plugins, Add New, Upload Plugin, or install it from the Plugins directory. Activate it.
2. A setup guide opens. If you skip it, open Hatch in the admin menu and choose Run the setup guide again.
3. Create a Cloudflare token at https://dash.cloudflare.com/profile/api-tokens (choose Create Token, then a custom token). Add these permissions:
   * Account, Workers Scripts, Edit (required)
   * Account, Account Settings, Read (recommended, lets Hatch list your accounts)
   * Zone, Zone, Read and Zone, Workers Routes, Edit (only if you want your own domain instead of a workers.dev address)
4. Paste the token into the setup guide and choose Check token. Then choose where your frontend will live, tick the box that confirms the changes, and press Deploy.

= What Hatch changes on your site =

* **Consent first.** A deploy does not start until you tick a box that lists the changes below.
* **Frontend account (you create it).** The deploy never creates users or Application Passwords. Before a deploy you create a user with the Subscriber role and an Application Password for it, with WordPress's own screens, and enter the user name and password in the setup guide. Hatch refuses any account that can edit other people's posts or manage users, plugins or the site, both when you enter it and every time it signs in. The frontend uses that account only to read. Disconnect (Hatch, Connection) forgets the stored copy; you revoke the Application Password in your profile.
* **Sign-in for frontend visitors.** Off until you switch on Frontend accounts (Hatch, Content). While it is off, the `hatch/v1/auth` routes do not exist. When it is on, the routes exist, and the frontend shows its login and registration pages only if WooCommerce is also active. Login checks the password with core `wp_authenticate()` and also sets the normal WordPress login cookie, because WooCommerce keeps carts and orders on that session. Registration works only when "Anyone can register" is on and creates the user with core `wp_create_user()` and the "New User Default Role", and is refused if that role can edit posts or manage the site. Staff accounts (anyone who can edit posts or manage the site) are refused and sign in at wp-admin. They use signed tokens (JWT, valid 24 hours), a per-IP rate limit and a honeypot field on registration. Logging out, or changing a password, ends all earlier sessions for that user. Sessions issued by versions before 0.8.0 are no longer valid, so signed-in visitors log in once more after the update.
* **Redirect to your frontend.** After a successful deploy, visitors who open the raw WordPress address are sent to the same path on your frontend, and the View post, View page and archive links in wp-admin point at it too. WordPress stays the back office: wp-admin, wp-login, the REST API, feeds, sitemaps and previews are never redirected (feeds move only if you switch on WordPress feeds under Performance), and a signed-in user still sees the site's own theme on the bare home URL. Hatch does not install, bundle, switch or remove any theme. Disconnect (Hatch, Connection) turns the redirect off.
* **Image address helper (only on local or temporary addresses).** When WordPress itself runs on `localhost`, a Docker host or a trycloudflare.com address and a frontend is connected, Hatch copies one small file, `hatch-url-rewrite.php`, into `wp-content/mu-plugins/` so images and links use your frontend address. It is never installed on a normal public domain. The file is marked as written by Hatch, does nothing while Hatch is off, and is removed when Hatch is deactivated or deleted. A file with that name that Hatch did not write is never changed or deleted. If the folder cannot be written, Hatch shows a notice with the exact manual step.
* **Permalinks.** If your site uses plain permalinks (the link format of your posts), the frontend cannot read your posts. The setup guide offers to change them to `/%postname%/`, and does so only if you tick that box. Sites that already use pretty permalinks are left alone.
* **Application password.** The Application Password you entered is stored encrypted on your site (so a redeploy does not ask again) and given to your Worker as an encrypted secret. Hatch never shows it again and never creates, lists or deletes Application Passwords. Review and revoke it under Users, Profile, Application Passwords, at any time.
* **Uploads folder rules.** Hardening adds a clearly marked block to `uploads/.htaccess` on servers that use Apache. It is removed on uninstall.
* **Scheduled checks.** A 15-minute check of your own frontend address, only after you have saved one.

= Data Hatch stores =

* **Form submissions.** When a visitor submits a form through the frontend, Hatch stores the field values, the form and provider name, the visitor's IP address and browser user agent in the table `wp_hatch_form_submissions` (your table prefix may differ). Entries older than 90 days are deleted automatically, at most once a day. Change the period with the `hatch_form_retention_days` filter, or return 0 to keep entries. Hatch has no personal-data export or erasure tool for this table yet, so to answer a data request delete the matching rows from the table.
* **Comments** are stored as normal WordPress comments.
* **Login attempts.** The frontend sign-in rate limit and the optional login lockout keep short-lived counters per IP address in transients.

= Uninstalling =

Deactivating the plugin removes the helper file in `mu-plugins`, stops Hatch's scheduled events. It keeps the stored frontend account name and encrypted password, so reactivating Hatch does not break your deployed frontend; Disconnect (Hatch, Connection) or deleting the plugin removes them.

Deleting the plugin always removes: the helper file in `mu-plugins` (only if Hatch wrote it), the encrypted Cloudflare token, the webhook and cache-refresh secrets, the Turnstile secret key, deploy and connection state, Hatch scheduled events, temporary data, the marked block in `uploads/.htaccess`, the stored frontend account name and encrypted Application Password. Hatch never created that user or password, so neither is deleted from WordPress; revoke the password in your profile.

Your settings, design choices, form submissions and the submissions table are kept unless you tick "Remove all data on uninstall" in the Hatch settings before deleting the plugin.

The Worker deployed in your Cloudflare account is not touched. Remove it in the Cloudflare dashboard under Workers & Pages.

== Screenshots ==

1. Connection tab: your Cloudflare connection, the live address of your frontend and the history of every deploy.
2. Design tab: pick a starter design, then set colours, fonts and layout.
3. Content tab: your site name and logo, post link format, homepage, menus and comment settings in one place.
4. Plugins tab: see which SEO, forms, shop and field plugins Hatch is reading from.
5. Performance tab: the Slim down and protect WordPress switch removes extras your frontend does not need.
6. Security tab: switch on protections such as locking the public data feed and login lockouts.
7. Status tab: a plain checklist of what is working and what needs attention.

== Frequently Asked Questions ==

= What is headless WordPress? =

It means WordPress is only your back office. You write and manage content there as usual, and a separate frontend shows it to visitors. Hatch sets up that frontend on Cloudflare for you and keeps it in step with WordPress.

= Will my SEO settings carry over? =

Hatch reads the titles, descriptions and social settings you already set in RankMath or Yoast SEO and passes them to the frontend. If no SEO plugin is active, the frontend uses your post title and excerpt.

= What is a Cloudflare token? =

It is a long password that you create in your Cloudflare account. It lets Hatch upload your frontend, and only with the permissions you tick. The setup guide shows each step and the list of permissions to copy.

= What is a Worker? =

A Worker is a small program that runs on Cloudflare's network. Hatch uses one to serve your frontend. It gets a free address ending in workers.dev, and you can use your own domain instead.

= Does Hatch create users or passwords? =

Not for itself. The deploy never creates users or Application Passwords: it asks you for the user name and an Application Password of a low-privilege account (Subscriber) that you create yourself, and refuses accounts that can edit other people's posts or manage users, plugins or the site. Visitors can create their own accounts only if you switch on Frontend accounts and WordPress's "Anyone can register" is on. The sign-in and registration routes for a frontend on another domain are off until you switch on Frontend accounts. They use WordPress's own authentication (so login-limit and security plugins still apply), and registration works only when the core "Anyone can register" setting is on, with the core "New User Default Role".

= How do I undo it? =

Open Hatch, then the Connection tab, then Disconnect. The redirect stops and the saved Cloudflare token and frontend account password are forgotten. Revoke the frontend's Application Password in your profile afterwards. The Worker stays in your Cloudflare account until you delete it there, under Workers & Pages.

= Do I need to pay for Cloudflare? =

The free Cloudflare plan includes Workers. Cloudflare sets the limits and prices; see https://developers.cloudflare.com/workers/platform/limits/. Hatch itself has no fees.

= Does Hatch see my Cloudflare token? =

Your token stays on your own server. It is encrypted before it is saved, sent only to Cloudflare, never returned to your browser and never written to logs. Hatch has no server of its own to receive it. Disconnect (Hatch, Connection) deletes it, and so does deleting the plugin.

= What permissions does the token need? =

Account, Workers Scripts, Edit is required. Account Settings, Read is optional. Zone Read and Workers Routes Edit are needed only for a custom domain. Use a token limited to one account and, for a custom domain, one zone.

= Can I deploy somewhere other than Cloudflare? =

Not in this version. Hatch deploys to Cloudflare only. The REST API works with any frontend you build.

= Do I have to use the frontend Hatch deploys? =

No. The `hatch/v1` REST API works with any frontend you build. The one Hatch deploys (built with Astro) is the quick way to get started.

= Do I need custom blocks? =

No. Write with the standard block editor. Hatch reads what you write over REST.

= Will it work with my SEO, forms or shop plugin? =

Hatch reads RankMath and Yoast SEO, Fluent Forms, WPForms, Contact Form 7 and Gravity Forms, WooCommerce, and Advanced Custom Fields when they are active. If none is installed, the matching features stay off.

= My site is on localhost or behind a firewall. Can I deploy? =

You can check your token and deploy, but the deployed frontend runs on Cloudflare's network and must be able to reach your site over https. Use a public address or a tunnel.

= Is my data sent anywhere without my consent? =

No. Every external request is listed under External services and starts only after you enter the relevant token, key or address.

= Why do the permalinks and links change? =

See "What Hatch changes on your site". The redirect and the frontend links start when an administrator presses Deploy. The permalink change happens only if the administrator ticked the box for it.

== Changelog ==

= 0.2 =
* First public release on WordPress.org.
* Deploys an Astro frontend to your own Cloudflare account from your dashboard, with a Cloudflare token you supply. The token is stored encrypted. Disconnect undoes the WordPress side.
* The frontend reads WordPress over REST with the user name and Application Password of a low-privilege account you create yourself. Accounts that can edit other people's posts or manage users, plugins or the site are refused, and the check runs again on every Application Password sign-in.
* Hatch never creates or deletes users, never creates Application Passwords, and never installs or switches a theme.
* Frontend sign-in and registration are off by default. Switch on Frontend accounts (Hatch, Content) to use them. Registration also follows WordPress's "Anyone can register" setting and is refused when the New User Default Role can edit posts or manage the site. Staff accounts sign in at wp-admin.
* No remote scripts are bundled, and the frontend ships no `_headers` file. Every external request is listed under External services.
* Brand and border colour settings accept only hex colours.

== Upgrade Notice ==

= 0.2 =
First public release.
