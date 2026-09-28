const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');

const userscript = readFileSync('janitorai-nag-eater.user.js', 'utf8');

function run(surfaces = []) {
  let menuCommand;
  let mutationCallback;
  const alerts = [];

  class Element {
    constructor({ surface = false, overlay = null, descendants = [] } = {}) {
      this.surface = surface;
      this.overlay = overlay;
      this.descendants = descendants;
      this.attributes = new Map();
    }

    append() {}

    closest() {
      return this.overlay;
    }

    matches() {
      return this.surface;
    }

    querySelectorAll() {
      return this.descendants.filter((element) => element.surface);
    }

    setAttribute(name, value) {
      this.attributes.set(name, value);
    }
  }

  class MutationObserver {
    constructor(callback) {
      mutationCallback = callback;
    }

    observe() {}
  }

  const documentElement = new Element({ descendants: surfaces });
  const context = {
    Element,
    MutationObserver,
    alert: (message) => alerts.push(message),
    document: {
      createElement: () => ({ textContent: '' }),
      documentElement,
      head: documentElement,
    },
    GM_registerMenuCommand: (name, callback) => {
      menuCommand = { name, callback };
    },
  };

  vm.runInNewContext(userscript, context);
  return { alerts, menuCommand, mutationCallback, Element };
}

test('counts each targeted promotional surface once', () => {
  const setup = run();
  const overlay = new setup.Element();
  const surface = new setup.Element({ surface: true, overlay });

  setup.mutationCallback([{ addedNodes: [surface, surface] }]);
  setup.menuCommand.callback();

  assert.equal(
    setup.alerts[0],
    'JanitorAI Nag Eater suppressed 1 promotional element on this page.',
  );
});

test('menu command displays the current page count', () => {
  const setup = run();

  setup.menuCommand.callback();

  assert.equal(setup.menuCommand.name, 'Show suppressed promotion count');
  assert.equal(
    setup.alerts[0],
    'JanitorAI Nag Eater suppressed 0 promotional elements on this page.',
  );
});
