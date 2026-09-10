# Prestige Waste Removal static website

The 20 exported pages run as HTML, CSS, and JavaScript without WordPress, PHP, a database, or a build step. Original styling, images, fonts, and browser-side Elementor assets are retained. Keep `wp-content` and `wp-includes`: these folders contain the site's static design assets.

## Deploy with GitHub and Vercel

1. Push this folder to your GitHub repository.
2. Import the repository into Vercel.
3. Choose **Other** as the framework, use the repository root, and leave the build command empty. Output directory is `.` (configured in `vercel.json`).
4. Deploy.

No environment variables are required. `.vercelignore` excludes development tools and original backups from deployment. GitHub repository: https://github.com/marc-tiongson/prestigewasteremoval. Vercel deployment is a separate step.

## Local preview

With Node.js installed, run `node tools/serve.cjs`, then open http://localhost:8080. You can also open `index.html` directly; use HTTP preview for the most reliable behavior of dynamically loaded browser assets.

## Functionality

- Original page layouts and responsive styles are preserved.
- Navigation, service links, mobile slide-out menu, keyboard dismissal, pickup/contact buttons, and site search work locally.
- Forms retain their original appearance and validate inputs. By default, submission prepares an email draft addressed to the contact email already present in the export; it does not send mail automatically. Direct delivery was deferred as requested. Optional endpoint settings are in `static/config.js`.
- Social icons have no profile URLs in the supplied source. No business profiles have been invented.
- The missing portable-toilets URL points to the services overview; no portable-toilets page was present in the export. The old monthly archive links point to the exported blog archive.

## Maintenance and verification

Edit the HTML pages directly. Run `node tools/verify.cjs` to check local page and asset links. `tools/browser-test.cjs` runs browser checks against a Chrome debugging session on port 9222 and the local preview on port 8080.

Original HTML backups are in `tools/original/` (excluded from Git and deployment). `tools/convert.cjs` records the conversion and can regenerate from those backups; it overwrites subsequent manual HTML edits, so do not run it during ordinary content maintenance.

The exported XML sitemaps contain relative URLs. Once a production domain is chosen, update their URLs, canonical metadata, and `robots.txt` to use that domain before relying on sitemap submission.
