import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

export const sourceDir = path.resolve('source/prestigewasteremoval-main');

export async function discoverPages(directory = sourceDir) {
  const pages = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['wp-content', 'wp-includes', 'static', 'tools'].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) pages.push(...await discoverPages(file));
    else if (entry.name === 'index.html') pages.push(file);
  }
  return pages.sort();
}

export function extractPage(html, route) {
  const $ = load(html);
  const scripts = [];
  $('body script').each((_, element) => {
    scripts.push($.html(element));
    $(element).remove();
  });
  // Next supplies charset/viewport; preserve all other original metadata and CSS order.
  $('head meta[charset], head meta[name="viewport"]').remove();
  return {
    route,
    head: $('head').html(),
    body: $('body').html(),
    bodyAttributes: $('body').attr(),
    scripts: scripts.join('\n'),
  };
}

async function prepare() {
  await mkdir('generated', { recursive: true });
  await mkdir('public', { recursive: true });
  const pages = {};
  for (const file of await discoverPages()) {
    const relative = path.relative(sourceDir, path.dirname(file)).split(path.sep).join('/');
    const route = relative ? `/${relative}/` : '/';
    pages[route] = extractPage(await readFile(file, 'utf8'), route);
  }
  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    if (['wp-content', 'wp-includes', 'static'].includes(entry.name) || /\.(xml|xsl|txt)$/.test(entry.name)) {
      await cp(path.join(sourceDir, entry.name), path.join('public', entry.name), { recursive: true });
    }
  }
  await writeFile('generated/pages.json', JSON.stringify(pages));
  console.log(`Prepared ${Object.keys(pages).length} Next.js pages and original assets.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/prepare-site.mjs')) {
  await prepare();
}
