const { readFileSync } = require('node:fs');
const { test, expect } = require('@playwright/test');

const source = readFileSync(process.env.USERSCRIPT_PATH || 'janitorai-nag-eater.user.js', 'utf8');
const ui = `<main><div id="chat"><h1>Chat</h1><h2>Messages</h2><h3>Today</h3>
<p>Continue this chat in the app</p><span>Get the app</span><a href="#chat">History</a>
<ul><li>Message</li></ul><textarea aria-label="Message"></textarea>
<button onclick="this.textContent='Sent'">Send</button></div>
<div role="dialog" id="ordinary">Ordinary dialog</div>
<div class="_modalOverlay_normal" id="ordinary-overlay">Ordinary overlay</div>
<div class="_plusSurface_closed" data-modal-open="false" id="closed">Closed surface content</div>
<div class="_appPromotionContainer_test" id="unverified">Get the app<button>Download</button></div>
<div class="bentoAppPromotionBanner_test" id="unverified2">Continue this chat in the app</div>
<div class="bentoAppBanner_test" id="unverified3">Get the app</div></main>`;
const promo = '<div id="promo" class="_modalOverlay_test"><div class="_plusSurface_test" data-modal-open="true">Plus promotion</div></div>';

async function install(page) {
  await page.evaluate(() => {
    window.alerts = [];
    window.alert = message => window.alerts.push(message);
    window.GM_registerMenuCommand = (name, callback) => { window.menu = { name, callback }; };
  });
  await page.addScriptTag({ content: source });
}

async function assertUsable(page) {
  for (const selector of ['#chat', '#chat h1', '#chat h2', '#chat h3', '#chat p', '#chat span', '#chat a', '#chat li', '#chat button', '#ordinary', '#ordinary-overlay', '#closed', '#unverified', '#unverified2', '#unverified3']) {
    await expect(page.locator(selector)).toBeVisible();
    expect(await page.locator(selector).evaluate(el => Boolean(el.closest('[inert], [aria-hidden="true"]')))).toBe(false);
  }
  await page.getByRole('textbox', {name:'Message'}).fill('A normal chat message');
  await page.getByRole('button', {name:'Send', exact:true}).click();
  await expect(page.getByRole('button', {name:'Sent', exact:true})).toBeVisible();
}

test('regression: ordinary UI and chat remain visible and interactive without a banner', async ({page}) => {
  await page.setContent(ui.replace(/<div class="(?:_appPromotionContainer_|bentoApp)[\s\S]*?<\/main>/, '</main>'));
  await install(page);
  for (const selector of ['#chat', '#chat h2', '#chat h3', '#chat p', '#chat span', '#chat a', '#chat li', '#chat button']) {
    await expect(page.locator(selector)).toBeVisible();
  }
  await page.getByRole('textbox').fill('Hello');
  await page.getByRole('button', {name:'Send'}).click();
  await expect(page.getByRole('button', {name:'Sent'})).toBeVisible();
});

test('preserves legitimate containers, dialogs, and unverified app banners', async ({page}) => {
  await page.setContent(ui + promo);
  await install(page);
  await assertUsable(page);
  await expect(page.locator('#promo')).toBeHidden();
});

test('early CSS hides only confirmed Plus surfaces before observer runs', async ({page}) => {
  await page.setContent(ui);
  await install(page);
  const displays = await page.evaluate(markup => {
    document.body.insertAdjacentHTML('beforeend', markup);
    return ['#promo', '#promo > div', '#chat'].map(s => getComputedStyle(document.querySelector(s)).display);
  }, promo);
  expect(displays.slice(0,2)).toEqual(['none', 'none']);
  expect(displays[2]).not.toBe('none');
});

test('handles delayed insertion, navigation, and counts each Plus surface once', async ({page}) => {
  await page.setContent(ui);
  await install(page);
  await page.evaluate(() => window.menu.callback());
  expect(await page.evaluate(() => window.alerts[0])).toBe('JanitorAI Nag Eater suppressed 0 promotional elements on this page.');
  for (let i = 0; i < 2; i++) {
    await page.evaluate(markup => { document.querySelector('#promo')?.remove(); document.body.insertAdjacentHTML('beforeend', markup); }, promo);
    await expect(page.locator('#promo')).toHaveAttribute('data-jne-plus-promotion', '');
    await expect(page.locator('#promo')).not.toHaveAttribute('aria-hidden');
    expect(await page.locator('#promo').evaluate(el => el.inert)).toBe(false);
  }
  await page.evaluate(() => { const surface = document.querySelector('#promo > div'); surface.remove(); document.querySelector('#promo').append(surface); });
  await page.evaluate(() => window.menu.callback());
  expect(await page.evaluate(() => window.alerts.at(-1))).toBe('JanitorAI Nag Eater suppressed 2 promotional elements on this page.');
  await assertUsable(page);
});

test('observer handles a directly inserted surface and singular count', async ({page}) => {
  await page.setContent('<div class="_modalOverlay_test" id="promo"></div>');
  await install(page);
  await page.locator('#promo').evaluate(el => { el.innerHTML = '<div class="_plusSurface_test" data-modal-open="true">Plus</div>'; });
  await expect(page.locator('#promo')).toHaveAttribute('data-jne-plus-promotion', '');
  await page.evaluate(() => window.menu.callback());
  expect(await page.evaluate(() => window.menu.name)).toBe('Show suppressed promotion count');
  expect(await page.evaluate(() => window.alerts[0])).toBe('JanitorAI Nag Eater suppressed 1 promotional element on this page.');
});

test('document-start installation preserves later chat rendering', async ({page}) => {
  await install(page);
  await page.evaluate(html => { document.body.innerHTML = html; }, ui);
  await assertUsable(page);
});

test('suppression preserves node identity, children, state and site-owned attributes', async ({page}) => {
  await page.setContent(ui + promo);
  await page.evaluate(() => {
    window.ownedOverlay = document.querySelector('#promo');
    window.ownedSurface = window.ownedOverlay.firstElementChild;
    window.ownedSurface.innerHTML = '<input value="retained"><button>Original</button>';
    window.ownedInput = window.ownedSurface.firstElementChild;
    window.ownedInput.value = 'unsaved state';
    window.ownedOverlay.setAttribute('aria-hidden', 'false');
    window.ownedSurface.lastElementChild.addEventListener('click', () => window.listenerWorked = true);
    window.removed = [];
    new MutationObserver(records => {
      for (const record of records) window.removed.push(...record.removedNodes);
    }).observe(document.body, {childList: true, subtree: true});
  });
  await install(page);
  await expect(page.locator('#promo')).toBeHidden();
  expect(await page.evaluate(() => ({
    overlay: document.querySelector('#promo') === window.ownedOverlay,
    surface: window.ownedOverlay.firstElementChild === window.ownedSurface,
    input: window.ownedSurface.firstElementChild === window.ownedInput,
    value: window.ownedInput.value,
    removed: window.removed.length,
    aria: window.ownedOverlay.getAttribute('aria-hidden'),
    inert: window.ownedOverlay.inert,
  }))).toEqual({overlay: true, surface: true, input: true, value: 'unsaved state', removed: 0, aria: 'false', inert: false});
  // Simulate the owning renderer changing component state, then unmounting
  // its retained references. This is a DOM lifecycle fixture, not live React.
  await page.evaluate(() => window.ownedSurface.setAttribute('data-modal-open', 'false'));
  await expect(page.locator('#promo')).toBeVisible();
  await page.getByRole('button', {name: 'Original'}).click();
  expect(await page.evaluate(() => window.listenerWorked)).toBe(true);
  await page.evaluate(() => {
    window.ownedOverlay.removeChild(window.ownedSurface);
    document.body.removeChild(window.ownedOverlay);
  });
  await assertUsable(page);
});

for (const fallback of [false, true]) {
  test(`releases reused overlays after close, retarget, move and removal (fallback=${fallback})`, async ({page}) => {
    await page.setContent(ui + promo.replace('Plus promotion</div>', 'Plus promotion</div>Overlay content') + '<div id="destination" class="_modalOverlay_other">Destination content</div>');
    await install(page);
    if (fallback) {
      // Remove only the :has rule to exercise the actual marker-only CSS path.
      await page.evaluate(() => {
        const sheet = [...document.styleSheets].find(sheet => [...sheet.cssRules].some(rule => rule.selectorText?.includes('data-jne-plus-promotion')));
        for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
          if (sheet.cssRules[i].selectorText?.includes(':has(')) sheet.deleteRule(i);
        }
      });
    }
    const surface = page.locator('#promo > div');
    await expect(page.locator('#promo')).toBeHidden();
    await surface.evaluate(el => el.setAttribute('data-modal-open', 'false'));
    await expect(page.locator('#promo')).toBeVisible();
    await expect(page.locator('#promo')).not.toHaveAttribute('data-jne-plus-promotion');
    await surface.evaluate(el => el.setAttribute('data-modal-open', 'true'));
    await expect(page.locator('#promo')).toBeHidden();
    await surface.evaluate(el => el.className = 'ordinary');
    await expect(page.locator('#promo')).toBeVisible();
    await surface.evaluate(el => el.className = '_plusSurface_test');
    await expect(page.locator('#promo')).toBeHidden();
    await surface.evaluate(el => document.querySelector('#destination').append(el));
    await expect(page.locator('#promo')).toBeVisible();
    await expect(page.locator('#destination')).toBeHidden();
    await page.locator('#destination > div').evaluate(el => el.remove());
    await expect(page.locator('#destination')).toBeVisible();
    await page.evaluate(() => window.menu.callback());
    expect(await page.evaluate(() => window.alerts.at(-1))).toContain('1 promotional element');
    await assertUsable(page);
  });
}

test('attribute-only opening is counted and closing restores visibility', async ({page}) => {
  await page.setContent(promo.replace('data-modal-open="true"', 'data-modal-open="false"'));
  await install(page);
  await expect(page.locator('#promo')).toBeVisible();
  await page.locator('#promo > div').evaluate(el => el.dataset.modalOpen = 'true');
  await expect(page.locator('#promo')).toHaveAttribute('data-jne-plus-promotion', '');
  await page.evaluate(() => window.menu.callback());
  expect(await page.evaluate(() => window.alerts.at(-1))).toContain('1 promotional element');
  await page.locator('#promo > div').evaluate(el => el.dataset.modalOpen = 'false');
  await expect(page.locator('#promo')).toBeVisible();
});

test('preserves errors, navigation, Plus wording and partial structural matches', async ({page}) => {
  await page.setContent(ui + promo + `
    <div role="alert">Plus failed. Get the app or try again.</div>
    <div class="_plusSurface_example" id="missing-open">Plus account settings</div>
    <div data-modal-open="true" id="missing-class">Subscription controls</div>
    <div id="site-hidden" aria-hidden="true" inert>Site-owned hidden state</div>`);
  await install(page);
  for (const selector of ['[role="alert"]', '#missing-open', '#missing-class']) {
    await expect(page.locator(selector)).toBeVisible();
  }
  await page.getByRole('link', {name: 'History'}).click();
  expect(await page.evaluate(() => location.hash)).toBe('#chat');
  await expect(page.locator('#site-hidden')).toHaveAttribute('aria-hidden', 'true');
  expect(await page.locator('#site-hidden').evaluate(el => el.inert)).toBe(true);
  await assertUsable(page);
});

test('detached overlay loses our marker before being reused for an ordinary dialog', async ({page}) => {
  await page.setContent(promo);
  await install(page);
  await expect(page.locator('#promo')).toHaveAttribute('data-jne-plus-promotion', '');
  await page.evaluate(() => {
    window.overlay = document.querySelector('#promo');
    window.overlay.remove();
  });
  await expect.poll(() => page.evaluate(() => window.overlay.hasAttribute('data-jne-plus-promotion'))).toBe(false);
  await page.evaluate(() => {
    window.overlay.innerHTML = '<button>Close ordinary dialog</button>';
    document.body.append(window.overlay);
  });
  await expect(page.getByRole('button', {name: 'Close ordinary dialog'})).toBeVisible();
});
