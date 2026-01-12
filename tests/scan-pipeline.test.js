/**
 * Scan Pipeline Spec (Issue 19 + Issue 12)
 *
 * These tests lock in the expected behavior for the scanning pipeline
 * after Issue 19 (heuristics) and Issue 12 (language gating) are implemented.
 */

describe('scan pipeline (Issue 19 + Issue 12)', () => {
  const fs = require('fs');
  const path = require('path');
  const { DOMUtils } = require('../src/utils/dom-utils.js');

  /**
   * jsdom defaults:
   * - offsetParent === null (treated as hidden)
   * - innerText is incomplete
   *
   * For tests covering scanning heuristics we must explicitly mock these.
   */
  function makeVisible(el) {
    Object.defineProperty(el, 'offsetParent', {
      value: document.body,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(el, 'innerText', {
      get() {
        return this.textContent;
      },
      configurable: true,
    });
  }

  function makeAllVisible(selector) {
    document.querySelectorAll(selector).forEach(makeVisible);
  }

  describe('Issue 12: ensure lang-detect is loaded in content scripts', () => {
    test('manifest content_scripts should include src/utils/lang-detect.js BEFORE dom-utils.js', () => {
      const manifestPath = path.join(__dirname, '..', 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const js = manifest.content_scripts?.[0]?.js || [];

      const idxLang = js.indexOf('src/utils/lang-detect.js');
      const idxDom = js.indexOf('src/utils/dom-utils.js');

      // Required for runtime: DOMUtils can optionally consult LangDetect via globalThis.
      expect(idxLang).toBeGreaterThanOrEqual(0);
      expect(idxDom).toBeGreaterThanOrEqual(0);
      expect(idxLang).toBeLessThan(idxDom);
    });
  });

  describe('Issue 19: smarter scanning heuristics', () => {
    test('should include short text inside <main> (lower threshold)', () => {
      document.body.innerHTML = `
        <main>
          <p id="short">Yes</p>
          <p id="long">This is a longer paragraph that should definitely be translated.</p>
        </main>
      `;
      makeAllVisible('main, p');

      const elements = DOMUtils.getTranslatableElements({
        excludedSelectors: [],
        translateShortTexts: false,
        translateNavigation: false,
      });

      // New behavior (Issue 19): include short main-content text.
      expect(elements.find((e) => e.element.id === 'short')).toBeDefined();
      expect(elements.find((e) => e.element.id === 'long')).toBeDefined();
    });

    test('should skip navigation area even when text is long (default)', () => {
      document.body.innerHTML = `
        <nav>
          <ul>
            <li id="navitem">Navigation Item Long Enough</li>
          </ul>
        </nav>
        <main>
          <p id="mainp">Main content that is long enough.</p>
        </main>
      `;
      makeAllVisible('nav, ul, li, main, p');

      const elements = DOMUtils.getTranslatableElements({
        excludedSelectors: [],
        translateNavigation: false,
      });

      // New behavior (Issue 19): default skip nav/header/footer/aside.
      expect(elements.find((e) => e.element.id === 'navitem')).toBeUndefined();
      expect(elements.find((e) => e.element.id === 'mainp')).toBeDefined();
    });

    test('should skip elements inside interactive UI (button)', () => {
      document.body.innerHTML = `
        <button>
          <div id="btnDiv">Click here to submit and continue</div>
        </button>
        <p id="p">This paragraph is long enough to translate.</p>
      `;
      makeAllVisible('button, div, p');

      const elements = DOMUtils.getTranslatableElements({
        excludedSelectors: [],
      });

      // New behavior (Issue 19): anything inside interactive controls is skipped.
      expect(elements.find((e) => e.element.id === 'btnDiv')).toBeUndefined();
      expect(elements.find((e) => e.element.id === 'p')).toBeDefined();
    });
  });

  describe('Custom elements support (body-text)', () => {
    test('should scan body-text custom element used by sites like The Economist', () => {
      document.body.innerHTML = `
        <main>
          <body-text id="bt">This is article content inside a body-text custom element that should be translated.</body-text>
          <p id="regular">Regular paragraph content.</p>
        </main>
      `;
      makeAllVisible('main, body-text, p');

      const elements = DOMUtils.getTranslatableElements({
        excludedSelectors: [],
      });

      // body-text custom element should be captured
      expect(elements.find((e) => e.element.id === 'bt')).toBeDefined();
      expect(elements.find((e) => e.element.id === 'regular')).toBeDefined();
    });

    test('should NOT scan parent div when it contains body-text children (prevent duplicate)', () => {
      // Simulates The Economist DOM structure
      document.body.innerHTML = `
        <main>
          <div class="article-text" id="container">
            <body-text id="bt1">First paragraph with enough content to translate.</body-text>
            <body-text id="bt2">Second paragraph with enough content to translate.</body-text>
          </div>
        </main>
      `;
      makeAllVisible('main, div, body-text');

      const elements = DOMUtils.getTranslatableElements({
        excludedSelectors: [],
      });

      // body-text elements should be captured
      expect(elements.find((e) => e.element.id === 'bt1')).toBeDefined();
      expect(elements.find((e) => e.element.id === 'bt2')).toBeDefined();
      // Parent container should NOT be captured (would cause duplicate translation)
      expect(elements.find((e) => e.element.id === 'container')).toBeUndefined();
    });

    test('should NOT scan h2 when it contains body-text child (prevent duplicate)', () => {
      // Reproduces The Economist bug where h2 > body-text causes double translation
      document.body.innerHTML = `
        <main>
          <h2 id="heading">
            <body-text id="bt">Artificial intelligence promises to transform how and where things are made</body-text>
          </h2>
        </main>
      `;
      makeAllVisible('main, h2, body-text');

      const elements = DOMUtils.getTranslatableElements({
        excludedSelectors: [],
      });

      // body-text element should be captured
      expect(elements.find((e) => e.element.id === 'bt')).toBeDefined();
      // Parent h2 should NOT be captured (would cause duplicate translation)
      expect(elements.find((e) => e.element.id === 'heading')).toBeUndefined();
    });
  });

  describe('Issue 12: language detection gating (zh target)', () => {
    test('when targetLanguage is zh-CN and LangDetect is available, should skip Chinese paragraphs', () => {
      const LangDetect = require('../src/utils/lang-detect.js');
      globalThis.LangDetect = LangDetect;

      document.body.innerHTML = `
        <p id="zh">这是一段中文文本用于测试跳过逻辑</p>
        <p id="en">This is an English paragraph long enough.</p>
      `;
      makeAllVisible('p');

      const elements = DOMUtils.getTranslatableElements({
        excludedSelectors: [],
        targetLanguage: 'zh-CN',
      });

      // New behavior (Issue 12): skip already-zh when translating to zh-*.
      expect(elements.find((e) => e.element.id === 'zh')).toBeUndefined();
      expect(elements.find((e) => e.element.id === 'en')).toBeDefined();
    });
  });
});

