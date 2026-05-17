# Terms of Service

_Last updated: May 14, 2026 · Version 1.0_

> **Plain English:** Hatch is free, open-source software (MIT license). Use it however you want. No warranty. We're not responsible for what happens on your servers or in your hosting accounts. The 1-click deploy broker at `hatch.adityaarsharma.com` is a free convenience — use of it is at your own risk.

---

## 1. The Hatch software

Hatch consists of:
- A WordPress plugin distributed via https://github.com/adityaarsharma/hatch/releases
- An Astro frontend starter in the same repo
- An optional deployment broker at `hatch.adityaarsharma.com`

All source code is licensed under the **MIT License** (see `LICENSE` in the repo). The MIT license fully governs the software portion; what follows applies to the broker service.

---

## 2. The deployment broker (`hatch.adityaarsharma.com`)

This is a free, best-effort service operated by Aditya Sharma. By using it you agree to:

### 2.1 Authorized use only
Use it only for its stated purpose: brokering OAuth between your browser and your Vercel/Cloudflare account, or serving the bash installer for VPS deploys. Don't:
- Scrape or stress-test the service
- Probe for vulnerabilities without disclosing first (see `SECURITY.md`)
- Use it as a generic OAuth proxy for unrelated apps
- Attempt to access or modify other users' deployments

### 2.2 No SLA
- The service is provided "as-is" with no uptime guarantee
- May be paused, redeployed, or moved at any time
- May be rate-limited if abuse is detected
- The bash installer at `/install.sh` is served best-effort — verify checksums against the GitHub raw source if security matters to you

### 2.3 No liability
We provide the service for free. Use of it is at **your own risk**. We are not liable for:
- Failed deploys caused by the broker
- Lost work due to misconfigured deploy hooks
- Costs incurred on your Vercel/Cloudflare/VPS account from deployments triggered through the broker
- Any indirect, incidental, or consequential damages

### 2.4 Your responsibility
- The OAuth tokens / API tokens you authorize through Hatch are **yours**. Revoke them whenever you want.
- The projects created in your Vercel/Cloudflare/VPS account are **yours**. We don't claim ownership.
- The bills those services send you are **yours**. We never see or pay them.

---

## 3. Your content

Hatch never collects, copies, or analyzes your content (posts, pages, media). Your content stays in your WordPress install and on the hosting account you authorize. Refer to [docs/privacy.md](./privacy.md) for the data flow specifics.

---

## 4. Open source contributions

If you contribute code via pull request to https://github.com/adityaarsharma/hatch:
- You confirm you have the right to contribute it
- You license your contribution under the same MIT license the project uses
- You don't gain ownership stake in the project

See `CONTRIBUTING.md` for the contribution workflow.

---

## 5. Trademark

"Hatch" is the project name used for this open-source software. You may:
- Refer to "Hatch" when describing your use of it
- Fork the repository and call your fork whatever you want

You may not:
- Imply official endorsement by the Hatch maintainer
- Distribute a modified version under the name "Hatch" without making the modifications obvious

---

## 6. Changes to these terms

If these terms materially change, the version at the top is bumped and the change is logged in `CHANGELOG.md` in the Hatch repo. Watching the repo on GitHub notifies you of changes.

---

## 7. Governing law & jurisdiction

These terms are governed by the laws of **India**. Any dispute that cannot be resolved through community channels (GitHub issues, direct email) shall be resolved in the courts of **Indore, Madhya Pradesh, India**.

---

## 8. Contact

- Open an issue: https://github.com/adityaarsharma/hatch/issues
- Email: `seo@posimyth.com`
- Security disclosures: see [`SECURITY.md`](https://github.com/adityaarsharma/hatch/blob/main/SECURITY.md)
