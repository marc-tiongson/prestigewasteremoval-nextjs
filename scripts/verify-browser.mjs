import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);
const reference = spawn(process.execPath, ['source/prestigewasteremoval-main/tools/serve.cjs'], { stdio: 'pipe', windowsHide: true });
await new Promise((resolve, reject) => { reference.stdout.once('data', resolve); reference.once('error', reject); });
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const results = { pages: [], visuals: [], interactions: [] };
await mkdir('artifacts', { recursive: true });
try {
  const routes = Object.keys(JSON.parse(await readFile('generated/pages.json', 'utf8')));
  const context = await browser.newContext();
  for (const width of [1440, 390]) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    let errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /hydration|React error|did not match/i.test(message.text())) errors.push(message.text()); });
    for (const route of routes) {
      errors = [];
      const response = await page.goto(base + route, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200, route);
      await page.locator('#content').waitFor();
      const health = await page.evaluate(() => ({
        title: document.title,
        overflow: document.documentElement.scrollWidth > innerWidth,
        brokenImages: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src),
      }));
      assert.ok(health.title);
      assert.deepEqual(health.brokenImages.filter(url => url.startsWith(base)), [], route + ' broken local images');
      assert.deepEqual(errors, [], route + ' browser errors');
      results.pages.push({ route, width, ...health });
    }
    for (const route of ['/', '/about-us/', '/services/', '/contact-us/', '/employment-opportunity/']) {
      const shots = [];
      for (const origin of ['http://127.0.0.1:8080', base]) {
        await page.goto(origin + route, { waitUntil: 'networkidle' });
        await page.evaluate(async () => {
          await document.fonts.ready;
          for (let top = 0; top < document.body.scrollHeight; top += innerHeight * 0.7) {
            window.scrollTo({ top, behavior: 'instant' });
            await new Promise(resolve => setTimeout(resolve, 150));
          }
          await new Promise(resolve => setTimeout(resolve, 500));
          window.scrollTo({ top: 0, behavior: 'instant' });
          document.querySelectorAll('.swiper').forEach(el => el.swiper?.autoplay?.stop());
        });
        await page.waitForTimeout(1000);
        shots.push(await page.screenshot({ fullPage: true, animations: 'disabled' }));
      }
      const name = (route === '/' ? 'home' : route.replaceAll('/', '')) + '-' + width;
      await writeFile('artifacts/' + name + '-original.png', shots[0]);
      await writeFile('artifacts/' + name + '-next.png', shots[1]);
      const comparison = await page.evaluate(async images => {
        const decode = async src => {
          const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode();
          const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
          return { width: img.width, height: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data };
        };
        const [a, b] = await Promise.all(images.map(decode));
        if (a.width !== b.width || a.height !== b.height) return { sameSize: false, a: [a.width,a.height], b: [b.width,b.height] };
        let changed = 0;
        for (let i = 0; i < a.data.length; i += 4) {
          if (Math.max(...[0,1,2].map(k => Math.abs(a.data[i+k] - b.data[i+k]))) > 16) changed++;
        }
        return { sameSize: true, changedPixelRatio: changed / (a.width * a.height) };
      }, shots.map(b => b.toString('base64')));
      results.visuals.push({ route, width, ...comparison });
      console.log('Visual', route, width, comparison);
      assert.ok(comparison.sameSize, name + ' page dimensions differ: ' + JSON.stringify(comparison));
      assert.ok(comparison.changedPixelRatio < 0.01, name + ' visual difference exceeds 1%: ' + comparison.changedPixelRatio);
    }
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    if (width === 390) {
      await page.locator('a[href*="off_canvas%3Aopen"]:visible').first().click();
      const panel = page.locator('.e-off-canvas').first();
      assert.equal(await panel.getAttribute('aria-hidden'), 'false');
      await page.keyboard.press('Escape');
      assert.equal(await panel.getAttribute('aria-hidden'), 'true');
      results.interactions.push({ width, menu: 'open and Escape close passed' });
    } else {
      await page.locator('nav a:visible').filter({ hasText: /^About Us$/i }).first().click();
      await page.waitForLoadState('networkidle');
      assert.match(page.url(), /about-us/);
      results.interactions.push({ width, navigation: 'desktop About Us link passed' });
    }
    await page.close();
  }
  const page = await context.newPage();
  await page.goto(base + '/index.html?s=dumpster', { waitUntil: 'networkidle' });
  assert.ok(await page.locator('#search-results article').count() > 0);
  assert.match(await page.locator('#search-results h1').innerText(), /dumpster/i);
  await page.locator('#search-results article a').first().click();
  await page.waitForLoadState('networkidle');
  assert.ok(await page.locator('#content').count());
  results.interactions.push({ search: 'query, results and navigation passed' });

  await page.goto(base + '/contact-us/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.addEventListener('click', e => {
    if (e.target.closest('a[href^="mailto:"]')) e.preventDefault();
  }, true));
  const form = page.locator('[data-static-form="contact"]').first();
  assert.equal(await form.evaluate(f => f.checkValidity()), false);
  await form.locator('input:not([type="hidden"]):not([type="submit"]),textarea,select').evaluateAll(elements => {
    for (const el of elements) {
      if (el.type === 'file') continue;
      el.value = el.type === 'email' ? 'test@example.com' : el.type === 'tel' ? '4045550123' : 'Migration test';
    }
  });
  await form.locator('[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('.static-form-status a')?.href.startsWith('mailto:'));
  assert.match(await form.locator('.static-form-status').innerText(), /email draft is ready/);
  results.interactions.push({ forms: 'required validation and email draft passed; no email sent' });
  assert.equal((await page.goto(base + '/nonexistent-migration-test/')).status(), 404);
  results.interactions.push({ notFound: 'unknown route returns 404' });
  console.log(JSON.stringify(results, null, 2));
} finally {
  await writeFile('artifacts/browser-report.json', JSON.stringify(results, null, 2));
  await browser.close();
  reference.kill();
}
