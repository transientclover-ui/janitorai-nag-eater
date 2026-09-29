const { readFileSync } = require('node:fs');
const { test, expect } = require('@playwright/test');
const source = readFileSync('experimental/nag-eater-diagnostic.user.js', 'utf8');
const host = '[data-nag-eater-diagnostic-ui]';
const fixture = `<main><article id="secret-user-123" class="_appPromotionContainer_a81fe123 username-Alice-secret" role="dialog" aria-label="Alice private account" data-modal-open="true" data-token="secret-token" style="position:absolute;top:240px;left:50px;width:400px;height:200px">
<p>Continue this chat in the app</p><p>Pick up right where you are</p><a href="https://example.com/user/secret?token=secret-token">Get the app</a><span>private transcript Alice</span></article><button id="ordinary" style="position:absolute;top:500px">Ordinary action</button></main>`;
async function install(page, html = fixture) {
  await page.setContent(html);
  await page.evaluate(() => {
    window.commands = {};
    window.diagnosticListeners = [];
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function(type, callback, options) {
      // Track the diagnostic's window event types and every shield listener, excluding Playwright's mouse interceptors.
      if ((this === window && ['keydown', 'pagehide'].includes(type)) || this.hasAttribute?.('data-nag-eater-diagnostic-ui')) window.diagnosticListeners.push({ target: this, type, callback });
      return add.call(this, type, callback, options);
    };
    EventTarget.prototype.removeEventListener = function(type, callback, options) {
      window.diagnosticListeners = window.diagnosticListeners.filter(item => item.target !== this || item.type !== type || item.callback !== callback);
      return remove.call(this, type, callback, options);
    };
    window.GM_registerMenuCommand = (name, callback) => window.commands[name] = callback;
    window.sideEffects = [];
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) window[name] = () => { window.sideEffects.push(name); throw new Error('Forbidden network'); };
    navigator.sendBeacon = () => { window.sideEffects.push('beacon'); return false; };
    for (const name of ['getItem', 'setItem', 'removeItem']) Storage.prototype[name] = () => { window.sideEffects.push('storage'); throw new Error('Forbidden storage'); };
    window.siteClicks = 0;
    document.querySelector('article')?.addEventListener('click', () => window.siteClicks++);
    document.querySelector('#ordinary')?.addEventListener('click', () => window.siteClicks++);
    window.mutations = [];
    new MutationObserver(records => window.mutations.push(...records.map(r => r.type))).observe(document.querySelector('main'), { subtree: true, childList: true, attributes: true, characterData: true });
    window.originalMarkup = document.querySelector('main').outerHTML;
  });
  await page.addScriptTag({ content: source });
}
async function command(page, name = 'Capture element') {
  await page.evaluate(name => window.commands[`Nag Eater Diagnostic: ${name}`](), name);
}
async function selectCard(page) {
  await command(page);
  await page.mouse.move(60, 420);
  await page.mouse.click(60, 420);
  return JSON.parse(await page.getByRole('textbox', { name: 'Diagnostic report' }).inputValue());
}

test('redacted bounded structural report, phrase flags, target identity and no side effects', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await install(page);
  const report = await selectCard(page);
  expect(report.toolVersion).toBe('0.1.0');
  expect(report.selected.tag).toBe('article');
  expect(report.selected.role).toBe('dialog');
  expect(report.selected.states).toEqual({ 'data-modal-open': 'true' });
  expect(report.selected.classes.tokens[0]).toMatchObject({ category: 'possibly-generated', semanticHints: ['app', 'promotion', 'container'] });
  expect(report.textIndicators.knownPhrases).toEqual({ continueChatInApp: true, pickUpWhereYouAre: true, getTheApp: true });
  expect(report.ancestors.length).toBeLessThanOrEqual(4);
  expect(report.children.length).toBeLessThanOrEqual(8);
  expect(JSON.stringify(report)).not.toMatch(/Alice|secret|transcript|https:|a81fe123|username/);
  expect(await page.evaluate(() => ({ effects: window.sideEffects, mutations: window.mutations, clicks: window.siteClicks, unchanged: document.querySelector('main').outerHTML === window.originalMarkup }))).toEqual({ effects: [], mutations: [], clicks: 0, unchanged: true });
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator(host)).toHaveCount(0);
  expect(await page.evaluate(() => window.diagnosticListeners.length)).toBe(0);
  await page.locator('#ordinary').click();
  expect(await page.evaluate(() => window.siteClicks)).toBe(1);
});

test('Escape, cancel, repeated start and pagehide remove UI and release interaction', async ({ page }) => {
  await install(page);
  for (const mode of ['escape', 'button', 'pagehide']) {
    await command(page); await command(page);
    await expect(page.locator(host)).toHaveCount(1);
    if (mode === 'escape') await page.keyboard.press('Escape');
    if (mode === 'button') await page.getByRole('button', { name: 'Cancel capture' }).click();
    if (mode === 'pagehide') await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await expect(page.locator(host)).toHaveCount(0);
    expect(await page.evaluate(() => window.diagnosticListeners.length)).toBe(0);
    await page.locator('#ordinary').click();
  }
  expect(await page.evaluate(() => window.siteClicks)).toBe(3);
  expect(await page.evaluate(() => window.mutations)).toEqual([]);
});

test('local manual copy, last-report memory and forgetting', async ({ page }) => {
  await install(page);
  const report = await selectCard(page);
  await page.getByRole('button', { name: 'Select report for copying' }).click();
  expect(await page.getByRole('textbox').evaluate(el => el.selectionEnd - el.selectionStart)).toBeGreaterThan(100);
  await page.keyboard.press('Escape');
  await command(page, 'View last report');
  expect(JSON.parse(await page.getByRole('textbox').inputValue())).toEqual(report);
  await page.getByRole('button', { name: 'Forget report' }).click();
  await command(page, 'View last report');
  await expect(page.getByRole('textbox')).toHaveValue(/No report yet/);
});

test('ordinary chat, form values, editable content and arbitrary attributes never escape', async ({ page }) => {
  await install(page, fixture.replace(/<p>Continue[\s\S]*?<\/span>/, '<p>PRIVATE CHAT WITH PERSONAL DETAILS</p><textarea>Get the app</textarea><input value="AUTH SECRET"><div contenteditable="true">Pick up right where you are</div>'));
  const report = await selectCard(page);
  expect(report.textIndicators.knownPhrases).toEqual({ continueChatInApp: false, pickUpWhereYouAre: false, getTheApp: false });
  expect(JSON.stringify(report)).not.toMatch(/PRIVATE|PERSONAL|AUTH|SECRET|Alice/);
});

test('large trees are bounded and split phrases are not inferred', async ({ page }) => {
  await install(page);
  await page.locator('article').evaluate(el => {
    el.innerHTML = '<p>Continue <b>this chat</b> in the app</p>' + '<span class="private-account-789">private</span>'.repeat(5000);
  });
  const report = await selectCard(page);
  expect(report.children).toHaveLength(8);
  expect(report.selected.childElementCountCapped).toBe(100);
  expect(report.textIndicators.incomplete).toBe(true);
  expect(report.textIndicators.knownPhrases.continueChatInApp).toBe(false);
  expect(JSON.stringify(report).length).toBeLessThan(18000);
});

test('URL is reduced to coarse category and unknown tags/roles/states are redacted', async ({ page }) => {
  await page.route('https://janitorai.com/**', route => route.fulfill({ body: fixture, contentType: 'text/html' }));
  await page.goto('https://janitorai.com/chats/private-id?token=secret#account');
  await install(page);
  await page.locator('article').evaluate(el => { el.setAttribute('role', 'private-role'); el.setAttribute('aria-hidden', 'private-value'); });
  const report = await selectCard(page);
  expect(report.pageCategory).toBe('chat');
  expect(report.selected.role).toBe('redacted');
  expect(report.selected.states['aria-hidden']).toBe('redacted');
  expect(JSON.stringify(report)).not.toMatch(/private-id|secret|private-role|private-value|janitorai.com/);
});

test('runtime has only menu grant and no network, storage, clipboard or target-writing APIs', () => {
  expect(source.match(/\/\/ @grant\s+\S+/g)).toEqual(['// @grant        GM_registerMenuCommand']);
  expect(source).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|cookie|GM_xmlhttpRequest|GM_setValue|clipboard|innerHTML)\b/);
});
