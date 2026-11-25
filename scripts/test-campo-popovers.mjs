// Start the app first, then run: BASE_URL=http://localhost:3000 node scripts/test-campo-popovers.mjs
// CHROME_PATH selects a Chrome/Chromium installation on other platforms.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
try {
  for (const width of [1280, 390]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewport({ width, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/monitoring')) return request.respond({ status: 204 });
      if (url.includes('/diccionario-rimas.json')) return request.respond({ contentType: 'application/json', body: JSON.stringify({ io: 'gentío estío' }) });
      if (!url.startsWith(baseURL) && !url.startsWith('data:') && !url.startsWith('blob:')) {
        return request.respond({ contentType: 'application/json', body: JSON.stringify({ parse: { wikitext: '' }, query: { categorymembers: [] }, data: { meanings: [] } }) });
      }
      return request.continue();
    });
    await page.goto(`${baseURL}/campo-semantico`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#campo-word');
    await page.type('#campo-word', 'amor, tierra');
    await page.click('#campo-add .primary');
    await page.click('[data-pick="0"]');
    await page.click('[data-pick="1"]');
    await page.waitForNetworkIdle();
    const cards = await page.$$eval('.campo-card', elements => elements.map(element => ({
      background: getComputedStyle(element).backgroundColor,
      rect: element.getBoundingClientRect().toJSON(),
    })));
    assert.equal(cards.length, 2);
    cards.forEach(card => assert.equal(card.background, 'rgb(255, 255, 255)', 'Original cards have a white background'));
    if (width > 1000) assert.equal(cards[0].rect.top, cards[1].rect.top, 'Desktop cards share a row');
    else assert.ok(cards[1].rect.top > cards[0].rect.top, 'Mobile cards stack');

    const inViewport = async selector => {
      await page.waitForFunction(selector => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect && rect.width > 0 && rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
      }, {}, selector);
    };
    for (const id of ['campo-results-info', 'campo-scheme-info']) {
      await page.click(`#${id} summary svg`);
      await page.waitForSelector(`#${id}[open] .campo-info-popup`);
      await inViewport(`#${id} .composer-tooltip`);
      const alignment = await page.$eval(`#${id}`, element => {
        const trigger = element.querySelector('summary').getBoundingClientRect();
        const icon = element.querySelector('svg').getBoundingClientRect();
        return Math.abs((trigger.top + trigger.height / 2) - (icon.top + icon.height / 2));
      });
      assert.ok(alignment < 1, 'Information icon is vertically centered');
      await page.keyboard.press('Escape');
      assert.equal(await page.$eval(`#${id}`, element => element.open), false);
    }
    // The SVG click used to open and immediately close the popup after the card replaced its DOM.
    await page.click('.info-btn svg');
    await page.waitForSelector('.campo-popover');
    await inViewport('.campo-popover');
    assert.equal(await page.$eval('.info-btn', element => element.getAttribute('aria-expanded')), 'true');
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/campo-popup-${width}.png` });
    await page.keyboard.press('Escape');
    assert.equal(await page.$('.campo-popover'), null);
    assert.equal(await page.$eval('.info-btn', element => element === document.activeElement), true);
    await page.click('.info-btn svg');
    await page.waitForSelector('.campo-popover');
    await page.mouse.click(width - 8, 100);
    assert.equal(await page.$('.campo-popover'), null);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
    assert.deepEqual(errors, [], "No browser errors");
    console.log(`Campo semántico: cards, SVG clicks, alignment, popup bounds, Escape and outside click pass at ${width}px`);
    await context.close();
  }
} finally {
  await browser.close();
}
