/**
 * Tests for Issue 16: Rich Text Preservation in Translation
 * 
 * These tests verify that:
 * 1. Text nodes are correctly extracted from elements with inline formatting
 * 2. Translation is applied back to text nodes without losing markup
 * 3. Links, bold, italic, and mixed formatting are preserved
 * 
 * Note: These tests will FAIL until extractTextNodes() and applyTranslationToTextNodes()
 * are implemented in DOMUtils.
 */

const { DOMUtils } = require('../src/utils/dom-utils.js');

describe('DOMUtils - Rich Text Preservation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('extractTextNodes()', () => {
    test('should extract single text node from plain paragraph', () => {
      const p = document.createElement('p');
      p.textContent = 'Hello World';
      document.body.appendChild(p);

      // This method needs to be implemented
      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      expect(Array.isArray(textNodes)).toBe(true);
      expect(textNodes.length).toBe(1);
      expect(textNodes[0].textContent).toBe('Hello World');
    });

    test('should extract multiple text nodes from element with inline formatting', () => {
      const p = document.createElement('p');
      p.innerHTML = 'Click <a href="#">here</a> for more';
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      expect(textNodes.length).toBe(3);
      expect(textNodes[0].textContent).toBe('Click ');
      expect(textNodes[1].textContent).toBe('here');
      expect(textNodes[2].textContent).toBe(' for more');
    });

    test('should handle nested inline elements (<strong><em>text</em></strong>)', () => {
      const p = document.createElement('p');
      p.innerHTML = 'This is <strong><em>important</em></strong> text';
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      expect(textNodes.length).toBe(3);
      expect(textNodes[0].textContent).toBe('This is ');
      expect(textNodes[1].textContent).toBe('important');
      expect(textNodes[2].textContent).toBe(' text');
    });

    test('should skip empty text nodes', () => {
      const p = document.createElement('p');
      p.innerHTML = '<span></span>Hello<span></span>';
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      // Should only include the non-empty text node
      const nonEmpty = textNodes.filter(n => n.textContent.trim().length > 0);
      expect(nonEmpty.length).toBe(1);
      expect(nonEmpty[0].textContent).toBe('Hello');
    });

    test('should preserve text node order (depth-first traversal)', () => {
      const div = document.createElement('div');
      div.innerHTML = 'A<span>B<strong>C</strong>D</span>E';
      document.body.appendChild(div);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(div);
      const texts = textNodes.map(n => n.textContent);
      expect(texts).toEqual(['A', 'B', 'C', 'D', 'E']);
    });
  });

  describe('applyTranslationToTextNodes()', () => {
    test('should replace text in corresponding text nodes', () => {
      const p = document.createElement('p');
      p.innerHTML = 'Hello <strong>world</strong>!';
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      expect(typeof DOMUtils.applyTranslationToTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      const translations = ['你好 ', '世界', '！'];
      DOMUtils.applyTranslationToTextNodes(textNodes, translations);
      
      expect(p.innerHTML).toBe('你好 <strong>世界</strong>！');
    });

    test('should handle fewer translations than text nodes (leave remaining unchanged)', () => {
      const p = document.createElement('p');
      p.innerHTML = 'A <span>B</span> C';
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      expect(typeof DOMUtils.applyTranslationToTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      const translations = ['甲', '乙']; // Only 2 translations for 3 nodes
      DOMUtils.applyTranslationToTextNodes(textNodes, translations);
      
      // Third text node should remain unchanged
      expect(textNodes[0].textContent).toBe('甲');
      expect(textNodes[1].textContent).toBe('乙');
      expect(textNodes[2].textContent).toBe(' C');
    });

    test('should handle more translations than text nodes (ignore extra)', () => {
      const p = document.createElement('p');
      p.innerHTML = 'A <span>B</span>';
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      expect(typeof DOMUtils.applyTranslationToTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      const translations = ['甲', '乙', '丙', '丁']; // 4 translations for 2 nodes
      
      // Should not throw
      DOMUtils.applyTranslationToTextNodes(textNodes, translations);
      
      expect(textNodes[0].textContent).toBe('甲');
      expect(textNodes[1].textContent).toBe('乙');
    });
  });

  describe('integration: preserving links', () => {
    test('should keep <a> tags clickable after translation', () => {
      const p = document.createElement('p');
      p.innerHTML = 'Read the <a href="https://example.com">documentation</a> here.';
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      expect(typeof DOMUtils.applyTranslationToTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      const translations = ['阅读 ', '文档', ' 这里。'];
      DOMUtils.applyTranslationToTextNodes(textNodes, translations);
      
      const link = p.querySelector('a');
      expect(link).not.toBeNull();
      expect(link.getAttribute('href')).toBe('https://example.com');
      expect(link.textContent).toBe('文档');
    });

    test('should preserve multiple links', () => {
      const p = document.createElement('p');
      p.innerHTML = 'Visit <a href="/a">page A</a> or <a href="/b">page B</a>';
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      expect(typeof DOMUtils.applyTranslationToTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      const translations = ['访问 ', '页面 A', ' 或 ', '页面 B'];
      DOMUtils.applyTranslationToTextNodes(textNodes, translations);
      
      const links = p.querySelectorAll('a');
      expect(links.length).toBe(2);
      expect(links[0].getAttribute('href')).toBe('/a');
      expect(links[1].getAttribute('href')).toBe('/b');
    });
  });

  describe('integration: preserving emphasis', () => {
    test('should preserve <strong> tags', () => {
      const p = document.createElement('p');
      p.innerHTML = 'This is <strong>important</strong> text';
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      expect(typeof DOMUtils.applyTranslationToTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      const translations = ['这是 ', '重要的', ' 文本'];
      DOMUtils.applyTranslationToTextNodes(textNodes, translations);
      
      expect(p.querySelector('strong')).not.toBeNull();
      expect(p.querySelector('strong').textContent).toBe('重要的');
    });

    test('should preserve <em> tags', () => {
      const p = document.createElement('p');
      p.innerHTML = 'This is <em>emphasized</em> text';
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      expect(typeof DOMUtils.applyTranslationToTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      const translations = ['这是 ', '强调的', ' 文本'];
      DOMUtils.applyTranslationToTextNodes(textNodes, translations);
      
      expect(p.querySelector('em')).not.toBeNull();
      expect(p.querySelector('em').textContent).toBe('强调的');
    });

    test('should preserve <code> tags', () => {
      const p = document.createElement('p');
      p.innerHTML = 'Use the <code>translate()</code> function';
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      expect(typeof DOMUtils.applyTranslationToTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      const translations = ['使用 ', 'translate()', ' 函数'];
      DOMUtils.applyTranslationToTextNodes(textNodes, translations);
      
      expect(p.querySelector('code')).not.toBeNull();
      expect(p.querySelector('code').textContent).toBe('translate()');
    });

    test('should preserve mixed <strong><em> nesting', () => {
      const p = document.createElement('p');
      p.innerHTML = 'This is <strong><em>very important</em></strong>';
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      expect(typeof DOMUtils.applyTranslationToTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      const translations = ['这是 ', '非常重要'];
      DOMUtils.applyTranslationToTextNodes(textNodes, translations);
      
      expect(p.querySelector('strong')).not.toBeNull();
      expect(p.querySelector('em')).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    test('should handle element with no text nodes', () => {
      const div = document.createElement('div');
      div.innerHTML = '<img src="test.jpg"><br>';
      document.body.appendChild(div);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(div);
      expect(textNodes.length).toBe(0);
    });

    test('should handle deeply nested structure (3+ levels)', () => {
      const div = document.createElement('div');
      div.innerHTML = '<p><span><strong><em>Deep</em></strong></span></p>';
      document.body.appendChild(div);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(div);
      expect(textNodes.length).toBe(1);
      expect(textNodes[0].textContent).toBe('Deep');
    });

    test('should handle adjacent text nodes', () => {
      const p = document.createElement('p');
      // Create adjacent text nodes
      p.appendChild(document.createTextNode('First'));
      p.appendChild(document.createTextNode('Second'));
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      expect(textNodes.length).toBe(2);
    });

    test('should not break with special characters in text', () => {
      const p = document.createElement('p');
      p.innerHTML = 'Price: <strong>$100</strong> (50% off)';
      document.body.appendChild(p);

      expect(typeof DOMUtils.extractTextNodes).toBe('function');
      expect(typeof DOMUtils.applyTranslationToTextNodes).toBe('function');
      
      const textNodes = DOMUtils.extractTextNodes(p);
      const translations = ['价格：', '$100', '（五折）'];
      
      // Should not throw
      DOMUtils.applyTranslationToTextNodes(textNodes, translations);
      expect(p.querySelector('strong').textContent).toBe('$100');
    });
  });
});
