import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import { discoverPages, sourceDir } from '../scripts/prepare-site.mjs';

test('all 20 routes preserve content, forms, metadata, styles and script order', async () => {
  const pages = JSON.parse(await readFile('generated/pages.json', 'utf8'));
  const originals = await discoverPages();
  assert.equal(originals.length, 20);
  assert.equal(Object.keys(pages).length, originals.length);
  for (const file of originals) {
    const relative = path.relative(sourceDir, path.dirname(file)).split(path.sep).join('/');
    const route = relative ? '/' + relative + '/' : '/';
    const original = load(await readFile(file, 'utf8'));
    const migrated = load('<html><head>' + pages[route].head + '</head><body>' + pages[route].body + pages[route].scripts + '</body></html>');
    for (const selector of ['h1,h2,h3', 'form', 'a', 'img', 'style', 'link[rel="stylesheet"]', 'script']) {
      const content = ($) => $(selector).toArray().map(el => $.html(el));
      assert.deepEqual(content(migrated), content(original), route + ' ' + selector);
    }
    assert.equal(migrated('title').text(), original('title').text());
    assert.deepEqual(pages[route].bodyAttributes, { ...original('body').attr() });
    for (const el of migrated('[src],link[rel="stylesheet"]').toArray()) {
      const url = migrated(el).attr('src') || migrated(el).attr('href');
      if (!url) continue;
      const resolved = new URL(url, 'http://site.test' + route);
      if (resolved.origin !== 'http://site.test') continue;
      await access(path.join('public', decodeURIComponent(resolved.pathname)));
    }
  }
});

test('legacy URLs retain redirects', async () => {
  const { default: config } = await import('../next.config.mjs');
  const redirects = await config.redirects();
  assert.ok(redirects.some(r => r.source === '/:path*/index.html'));
  assert.ok(redirects.some(r => r.source === '/service/portable-toilets/' && r.destination === '/services/'));
});
