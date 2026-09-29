const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');

const userscript = readFileSync('janitorai-nag-eater.user.js', 'utf8');

class TextNode {
  constructor(text) {
    this.textContent = text;
    this.parentElement = null;
  }
  get childNodes() {
    return [];
  }
}

class Element {
  constructor({ surface = false, overlay = null, descendants = [], appBanner = false, textContent = '' } = {}) {
    this.surface = surface;
    this.overlay = overlay;
    this.descendants = descendants;
    this.appBanner = appBanner;
    this.attributes = new Map();
    this.childNodes = [];
    this.textContent = textContent;
  }

  append() {}

  closest(selector) {
    return this.overlay;
  }

  matches(selector) {
    if (this.appBanner) {
      return true;
    }
    return this.surface;
  }

  querySelectorAll(selector) {
    const results = [];
    const collect = (node) => {
      if (node.appBanner) {
        results.push(node);
      }
      for (const child of node.childNodes) {
        collect(child);
      }
    };
    for (const child of this.childNodes) {
      collect(child);
    }
    return results;
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all[0] || null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
}

class TreeWalker {
  constructor(root, whatToShow, filter) {
    this._nodes = [];
    this._index = 0;
    this._collect(root);
  }

  _collect(node) {
    if (this._matches(node)) {
      this._nodes.push(node);
    }
    if (node.childNodes && typeof node.childNodes[Symbol.iterator] === 'function') {
      for (const child of node.childNodes) {
        this._collect(child);
      }
    }
  }

  _matches(node) {
    return node.textContent !== undefined;
  }

  nextNode() {
    if (this._index >= this._nodes.length) {
      return null;
    }
    const node = this._nodes[this._index];
    this._index += 1;
    return node;
  }
}

let capturedObserverCallback = null;

class MutationObserver {
  constructor(callback) {
    capturedObserverCallback = callback;
  }

  observe() {}
}

function makeContext({ surfaces = [], appBannerContainers = [], textNodes = [] } = {}) {
  capturedObserverCallback = null;

  const documentElement = new Element({
    descendants: surfaces,
    childNodes: appBannerContainers,
  });

  textNodes.forEach((tn) => {
    tn.parentElement = documentElement;
    documentElement.childNodes.push(tn);
  });

  const context = {
    Element,
    TextNode,
    TreeWalker,
    NodeFilter: { SHOW_TEXT: 4 },
    MutationObserver,
    alert: (message) => {
      if (!context._alerts) {
        context._alerts = [];
      }
      context._alerts.push(message);
    },
    document: {
      createElement: () => ({ textContent: '', append: () => {} }),
      documentElement,
      head: documentElement,
      createTreeWalker: (root, whatToShow, filter) => new TreeWalker(root, whatToShow, filter),
    },
    GM_registerMenuCommand: (name, callback) => {
      context._menuCommand = { name, callback };
    },
  };

  return context;
}

function run({ surfaces = [], appBannerContainers = [], textNodes = [] } = {}) {
  const context = makeContext({ surfaces, appBannerContainers, textNodes });

  context._alerts = [];
  context._menuCommand = null;

  vm.runInNewContext(userscript, context);

  return {
    alerts: context._alerts || [],
    menuCommand: context._menuCommand,
    mutationCallback: capturedObserverCallback,
    Element,
    TextNode,
    documentElement: context.document.documentElement,
  };
}

test('counts each targeted promotional surface once', () => {
  const overlay = new Element();
  const surface = new Element({ surface: true, overlay });

  const setup = run({ surfaces: [surface, surface] });
  setup.mutationCallback([{ addedNodes: [surface, surface] }]);
  setup.menuCommand.callback();

  assert.equal(
    setup.alerts[0],
    'JanitorAI Nag Eater suppressed 1 promotional Plus element and 0 app-promotion banner elements on this page.',
  );
});

test('menu command displays the current page count', () => {
  const setup = run();

  setup.menuCommand.callback();

  assert.equal(setup.menuCommand.name, 'Show suppressed promotion count');
  assert.equal(
    setup.alerts[0],
    'JanitorAI Nag Eater suppressed 0 promotional Plus elements and 0 app-promotion banner elements on this page.',
  );
});

test('removes app-promotion banner container with app CTA text', () => {
  const textNode = new TextNode('Pick up right where you are');
  const banner = new Element({ appBanner: true });
  banner.childNodes = [textNode];
  textNode.parentElement = banner;

  const setup = run({ appBannerContainers: [banner] });
  setup.mutationCallback([{ addedNodes: [banner] }]);

  assert.equal(setup.alerts.length, 0);
});

test('does not remove chat content that mentions app phrase', () => {
  const textNode = new TextNode('the last message was get the app but this is chat');
  const chatElement = new Element({ appBanner: false });
  chatElement.childNodes = [textNode];
  textNode.parentElement = chatElement;

  const setup = run({ appBannerContainers: [chatElement] });
  setup.mutationCallback([{ addedNodes: [chatElement] }]);

  assert.equal(setup.alerts.length, 0);
});

test('app banner detection requires both app-cta text and app-store context', () => {
  const textNode = new TextNode('get the app');
  const container = new Element({ appBanner: true });
  container.childNodes = [textNode];
  textNode.parentElement = container;

  const setup = run({ appBannerContainers: [container] });
  setup.mutationCallback([{ addedNodes: [container] }]);

  assert.equal(setup.alerts.length, 0);
});

test('multiple banner containers handled correctly', () => {
  const textNode1 = new TextNode('get the app download now');
  const banner1 = new Element({ appBanner: true });
  banner1.childNodes = [textNode1];
  textNode1.parentElement = banner1;

  const textNode2 = new TextNode('continue this chat in the app');
  const banner2 = new Element({ appBanner: true });
  banner2.childNodes = [textNode2];
  textNode2.parentElement = banner2;

  const setup = run({ appBannerContainers: [banner1, banner2] });
  setup.mutationCallback([{ addedNodes: [banner1] }, { addedNodes: [banner2] }]);
  setup.menuCommand.callback();

  assert.ok(setup.alerts[0].includes('2 app-promotion banner elements'), setup.alerts[0]);
});
