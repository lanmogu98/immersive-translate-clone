/**
 * DOM Layout Tests (Issue 38)
 *
 * 测试中英段落排布问题，包括：
 * - Case #1: Word Divs 重复翻译
 * - Case #2: BR Paragraphs 段落合并
 * - Case #3: Translation Style 样式问题
 */

const fs = require('fs');
const path = require('path');
const { DOMUtils } = require('../src/utils/dom-utils.js');

// Fixture 加载器
function loadFixture(name) {
  const content = fs.readFileSync(
    path.join(__dirname, 'fixtures/dom-layout', name),
    'utf-8'
  );
  // 移除 HTML 注释
  return content.replace(/<!--[\s\S]*?-->/g, '').trim();
}

// jsdom mock helpers (参考 dom-utils-filtering.test.js)
function makeVisible(element) {
  Object.defineProperty(element, 'offsetParent', {
    value: document.body,
    writable: true,
    configurable: true
  });
  Object.defineProperty(element, 'innerText', {
    get() { return this.textContent; },
    configurable: true
  });
}

function makeAllVisible(selector) {
  document.querySelectorAll(selector).forEach(el => makeVisible(el));
}

describe('DOM Layout Issues (Issue 38)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // ============================================================
  // Case #1: Word Divs - 重复翻译
  // ============================================================
  describe('Case #1: Word Divs - 重复翻译', () => {
    beforeEach(() => {
      document.body.innerHTML = loadFixture('case-001-word-divs.html');
      makeAllVisible('h1, div');
    });

    test('should NOT include aria-hidden divs in translatable elements', () => {
      const elements = DOMUtils.getTranslatableElements();

      // div.word[aria-hidden="true"] 不应该被单独选中
      const wordDivs = document.querySelectorAll('.word[aria-hidden="true"]');
      expect(wordDivs.length).toBeGreaterThan(0); // 确保 fixture 加载正确

      wordDivs.forEach(div => {
        const found = elements.find(e => e.element === div);
        expect(found).toBeUndefined();
      });
    });

    test('should include h1 as a single translation unit', () => {
      const elements = DOMUtils.getTranslatableElements();
      const h1 = document.querySelector('h1');

      expect(h1).not.toBeNull(); // 确保 fixture 加载正确

      const found = elements.find(e => e.element === h1);
      expect(found).toBeDefined();
    });

    test('h1 should be selected only once (no duplicates)', () => {
      const elements = DOMUtils.getTranslatableElements();
      const h1Matches = elements.filter(e =>
        e.element.tagName.toLowerCase() === 'h1'
      );
      expect(h1Matches.length).toBe(1);
    });

    test('total translatable elements should be 1 (only h1)', () => {
      const elements = DOMUtils.getTranslatableElements();
      // 理想情况：只有 h1 被选中，不包括内部的 div.word
      // 如果测试失败，说明 div.word 也被错误地选中了
      expect(elements.length).toBe(1);
    });
  });

  // ============================================================
  // Case #2: BR Paragraphs - 段落合并
  // ============================================================
  describe('Case #2: BR Paragraphs - 段落合并', () => {
    beforeEach(() => {
      document.body.innerHTML = loadFixture('case-002-br-paragraphs.html');
      makeAllVisible('p');
    });

    test('fixture should contain p with br elements', () => {
      const p = document.querySelector('p');
      expect(p).not.toBeNull();

      const brElements = p.querySelectorAll('br');
      expect(brElements.length).toBeGreaterThanOrEqual(2); // 至少有 <br><br>
    });

    test('should detect <br><br> as paragraph separator', () => {
      const p = document.querySelector('p');

      // 检测是否有连续的 <br> 元素
      const hasBrBr = DOMUtils.hasBrBrSeparator(p);
      expect(hasBrBr).toBe(true);
    });

    test('should split p with <br><br> into multiple translation units', () => {
      const elements = DOMUtils.getTranslatableElements();

      // 应该返回 2 个翻译单元（两个逻辑段落）
      // 而不是 1 个（整个 p）
      expect(elements.length).toBe(2);

      // 每个单元应该只包含一个逻辑段落的文本
      const texts = elements.map(e => e.text);
      expect(texts[0]).toContain('Claude automatically invokes');
      expect(texts[0]).not.toContain('Creating skills');
      expect(texts[1]).toContain('Creating skills');
      expect(texts[1]).not.toContain('Claude automatically invokes');
    });

    test('wrapped spans should be in correct positions (before <br><br>)', () => {
      const elements = DOMUtils.getTranslatableElements();

      // 第一个翻译单元应该在 <br><br> 之前
      // 第二个翻译单元应该在 <br><br> 之后
      const p = document.querySelector('p');
      const wrappers = p.querySelectorAll('.immersive-translate-text-wrapper');

      expect(wrappers.length).toBe(2);
    });
  });

  // ============================================================
  // Case #3: Translation Style - 样式问题
  // ============================================================
  describe('Case #3: Translation Style - 样式问题', () => {
    beforeEach(() => {
      document.body.innerHTML = loadFixture('case-003-translation-style.html');
      makeAllVisible('h3, strong, p, em, h2');
    });

    test('fixture should load correctly', () => {
      const h3 = document.querySelector('h3');
      const strong = document.querySelector('strong');

      expect(h3).not.toBeNull();
      expect(strong).not.toBeNull();
      expect(strong.textContent).toContain('Claude Developer Platform');
    });

    test('injectTranslationNode should create translation span with loading state', () => {
      const h3 = document.querySelector('h3');

      // injectTranslationNode 只接受 element 参数
      // 它创建 span 并显示 "Thinking..." 加载状态
      const node = DOMUtils.injectTranslationNode(h3);

      expect(node).not.toBeNull();
      expect(node.className).toBe('immersive-translate-target');
      expect(node.textContent).toContain('Thinking...');
    });

    test('appendTranslation should add translation text', () => {
      const h3 = document.querySelector('h3');
      const node = DOMUtils.injectTranslationNode(h3);

      // 使用 appendTranslation 添加翻译内容
      DOMUtils.appendTranslation(node, 'Claude 开发者平台（API）');

      expect(node.textContent).toContain('Claude 开发者平台');
      // 加载状态应该被清除
      expect(node.textContent).not.toContain('Thinking...');
    });

    // 记录当前行为：检查是否有内联样式（这是需要改进的问题）
    test('current behavior: translation span HAS inline styles (to be fixed)', () => {
      const h3 = document.querySelector('h3');
      const node = DOMUtils.injectTranslationNode(h3);

      const styleAttr = node.getAttribute('style');

      // 当前实现确实添加了内联样式 - 这是 Case #3 要修复的问题
      expect(styleAttr).not.toBeNull();
      console.log('[Case #3] Current inline styles:', styleAttr);

      // 验证具体的样式属性存在（记录当前行为）
      expect(styleAttr).toContain('font-size');
      expect(styleAttr).toContain('font-weight');
    });

    // 待实现的改进
    test.todo('should NOT use inline styles for translation span');

    test.todo('should insert <br> before translation for visual separation');

    test.todo('translation should be inside inline containers like <strong>');
  });
});
