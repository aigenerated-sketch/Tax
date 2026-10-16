// Post-build: emit one static HTML entry per route with its own title, description and
// canonical URL, plus sitemap.xml and robots.txt. No server or SPA fallback needed.
// Set SITE_URL (e.g. https://example.org) to emit canonical links and an absolute sitemap.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const routes = JSON.parse(readFileSync(join(root, 'src/app/routes.json'), 'utf8'));
const template = readFileSync(join(dist, 'index.html'), 'utf8');
const siteUrl = (process.env.SITE_URL ?? '').replace(/\/$/, '');
const base = (process.env.BASE_PATH ?? '/').replace(/\/$/, '');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

for (const r of routes) {
  const url = `${siteUrl}${base}${r.path === '/' ? '/' : `${r.path}/`}`;
  const html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(r.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(r.description)}" />`)
    .replace(
      '<!--canonical-->',
      siteUrl
        ? `<link rel="canonical" href="${esc(url)}" />\n    <meta property="og:title" content="${esc(r.title)}" />\n    <meta property="og:description" content="${esc(r.description)}" />\n    <meta property="og:url" content="${esc(url)}" />`
        : '',
    );
  const outDir = r.path === '/' ? dist : join(dist, r.path);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html);
}

if (siteUrl) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = routes
    .map((r) => `  <url><loc>${siteUrl}${base}${r.path === '/' ? '/' : `${r.path}/`}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n');
  writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}${base}/sitemap.xml\n`);
} else {
  writeFileSync(join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  console.warn('[prerender] SITE_URL not set: canonical links and sitemap.xml were not generated.');
}
console.log(`[prerender] wrote ${routes.length} route entries`);
