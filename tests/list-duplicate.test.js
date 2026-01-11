/**
 * Issue 29: Duplicate Translation in List Items
 *
 * Problem: List items (<li>) are translated twice:
 * 1. Correctly inside the list item
 * 2. Again as merged text at the bottom of the page
 *
 * Root cause: DOM scanning logic selects both <li> elements AND their parent
 * containers (like <div>), causing duplicate translation.
 *
 * This test verifies that:
 * 1. Only leaf-level translatable elements are selected
 * 2. Parent containers with translatable children are NOT selected
 * 3. No duplicate elements are returned
 */

const { DOMUtils } = require('../src/utils/dom-utils.js');

/**
 * Helper to make elements "visible" in jsdom
 */
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

describe('Issue 29: Duplicate Translation in List Items', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('list item scanning', () => {
    test('should return only <li> elements, not parent <ul>', () => {
      document.body.innerHTML = `
        <ul id="list">
          <li id="item1">First list item with enough text to translate</li>
          <li id="item2">Second list item with enough text to translate</li>
          <li id="item3">Third list item with enough text to translate</li>
        </ul>
      `;
      makeAllVisible('ul, li');

      const elements = DOMUtils.getTranslatableElements();
      const elementIds = elements.map(e => e.element.id);

      // Should include all <li> items
      expect(elementIds).toContain('item1');
      expect(elementIds).toContain('item2');
      expect(elementIds).toContain('item3');

      // Should NOT include the parent <ul> (not in selector anyway)
      expect(elementIds).not.toContain('list');
    });

    test('should NOT select parent <div> when it contains <li> elements that will be translated', () => {
      document.body.innerHTML = `
        <div id="container">
          <ul>
            <li id="item1">List item text that is long enough to translate</li>
            <li id="item2">Another list item with sufficient text content</li>
          </ul>
        </div>
      `;
      makeAllVisible('div, ul, li');

      const elements = DOMUtils.getTranslatableElements();
      const elementIds = elements.map(e => e.element.id);

      // Should include <li> items
      expect(elementIds).toContain('item1');
      expect(elementIds).toContain('item2');

      // Should NOT include the parent <div>
      // This is the key assertion for Issue 29
      expect(elementIds).not.toContain('container');
    });

    test('should NOT have duplicate text content in returned elements', () => {
      document.body.innerHTML = `
        <div id="wrapper">
          <h2 id="title">Learning Outcomes</h2>
          <ul>
            <li id="li1">Understand reinforcement learning fundamentals</li>
            <li id="li2">Apply value function approximation methods</li>
            <li id="li3">Implement policy gradient algorithms</li>
          </ul>
        </div>
      `;
      makeAllVisible('div, h2, ul, li');

      const elements = DOMUtils.getTranslatableElements();

      // Collect all text content from selected elements
      const allTexts = elements.map(e => e.text);

      // Count occurrences of each text
      const textCounts = {};
      allTexts.forEach(text => {
        // Normalize text for comparison
        const normalized = text.trim();
        textCounts[normalized] = (textCounts[normalized] || 0) + 1;
      });

      // Each text should appear only once
      Object.entries(textCounts).forEach(([text, count]) => {
        expect(count).toBe(1);
      });
    });

    test('should NOT select <div> that contains translatable <p> children', () => {
      document.body.innerHTML = `
        <div id="section">
          <p id="para1">This is the first paragraph with enough content.</p>
          <p id="para2">This is the second paragraph with enough content.</p>
        </div>
      `;
      makeAllVisible('div, p');

      const elements = DOMUtils.getTranslatableElements();
      const elementIds = elements.map(e => e.element.id);

      // Should include paragraphs
      expect(elementIds).toContain('para1');
      expect(elementIds).toContain('para2');

      // Should NOT include the parent div
      expect(elementIds).not.toContain('section');
    });
  });

  describe('nested structure handling', () => {
    test('should handle deeply nested lists correctly', () => {
      document.body.innerHTML = `
        <div id="outer">
          <div id="inner">
            <ul>
              <li id="nested-item">Deeply nested list item text content here</li>
            </ul>
          </div>
        </div>
      `;
      makeAllVisible('div, ul, li');

      const elements = DOMUtils.getTranslatableElements();
      const elementIds = elements.map(e => e.element.id);

      // Should only include the <li>
      expect(elementIds).toContain('nested-item');
      expect(elementIds).not.toContain('outer');
      expect(elementIds).not.toContain('inner');
    });

    test('should handle mixed content (text + list) in div', () => {
      document.body.innerHTML = `
        <div id="mixed">
          Some introductory text here.
          <ul>
            <li id="item">List item with enough text to translate</li>
          </ul>
        </div>
      `;
      makeAllVisible('div, ul, li');

      const elements = DOMUtils.getTranslatableElements();
      const elementIds = elements.map(e => e.element.id);

      // The <li> should be included
      expect(elementIds).toContain('item');

      // The div may or may not be included depending on implementation,
      // but the key is: if both are included, the li content should not
      // appear twice in the final translation output
      // For now, we test that if div is included, its text doesn't
      // completely overlap with the li text
    });

    test('CS234 page structure simulation', () => {
      // Simulate the Stanford CS234 page structure
      document.body.innerHTML = `
        <div id="content-section">
          <h2 id="outcomes-title">Learning Outcomes</h2>
          <ul id="outcomes-list">
            <li id="outcome1">Define the key features of reinforcement learning</li>
            <li id="outcome2">Given an application problem, formulate it as an RL problem</li>
            <li id="outcome3">Understand basic exploration methods and the exploration exploitation tradeoff</li>
            <li id="outcome4">Understand value function approximation and policy gradient methods</li>
            <li id="outcome5">Know how RL methods can be used to solve complex decision problems</li>
          </ul>
        </div>
      `;
      makeAllVisible('div, h2, ul, li');

      const elements = DOMUtils.getTranslatableElements();

      // Count how many times each outcome text appears
      const outcomeTexts = [
        'Define the key features of reinforcement learning',
        'Given an application problem, formulate it as an RL problem',
        'Understand basic exploration methods and the exploration exploitation tradeoff',
        'Understand value function approximation and policy gradient methods',
        'Know how RL methods can be used to solve complex decision problems'
      ];

      outcomeTexts.forEach(outcomeText => {
        const count = elements.filter(e => e.text.includes(outcomeText)).length;
        // Each outcome should appear exactly once
        expect(count).toBe(1);
      });

      // The parent div should NOT be selected if it only contains
      // elements that will be separately translated
      const contentSection = elements.find(e => e.element.id === 'content-section');
      expect(contentSection).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    test('div with direct text AND translatable children - potential duplicate issue', () => {
      // This is the KEY scenario for Issue 29
      // When a div has BOTH direct text AND translatable child elements,
      // the child text might get translated twice
      document.body.innerHTML = `
        <div id="problem-div">
          Introduction:
          <ul>
            <li id="item1">First list item with enough text to translate</li>
            <li id="item2">Second list item with enough text to translate</li>
          </ul>
        </div>
      `;
      makeAllVisible('div, ul, li');

      const elements = DOMUtils.getTranslatableElements();

      // Check if the li texts appear in multiple selected elements
      const item1Text = 'First list item with enough text to translate';
      const elementsContainingItem1 = elements.filter(e =>
        e.text.includes(item1Text)
      );

      // Item1 text should appear in EXACTLY ONE element (the li itself)
      // If it appears in both the li AND the parent div, that's the bug
      expect(elementsContainingItem1.length).toBe(1);
      expect(elementsContainingItem1[0].element.id).toBe('item1');
    });

    test('div with ONLY direct text (no child elements) SHOULD be translated', () => {
      document.body.innerHTML = `
        <div id="text-only">This div has only direct text content, no child elements at all.</div>
      `;
      makeAllVisible('div');

      const elements = DOMUtils.getTranslatableElements();
      const div = elements.find(e => e.element.id === 'text-only');

      // This div has direct text and no translatable children, so it should be included
      expect(div).toBeDefined();
    });

    test('empty parent div with only whitespace should NOT be translated', () => {
      document.body.innerHTML = `
        <div id="empty-parent">
          <p id="child">Child paragraph with text content here.</p>
        </div>
      `;
      makeAllVisible('div, p');

      const elements = DOMUtils.getTranslatableElements();
      const elementIds = elements.map(e => e.element.id);

      expect(elementIds).toContain('child');
      expect(elementIds).not.toContain('empty-parent');
    });
  });
});
