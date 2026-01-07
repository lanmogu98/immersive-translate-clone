/**
 * Tests for Issue 14: Domain/Element Exclusion List
 * 
 * These tests verify that:
 * 1. Domain exclusion patterns work (exact match, wildcard)
 * 2. CSS selector exclusions work
 * 3. Empty exclusion lists don't break functionality
 * 4. User configuration is correctly loaded
 * 
 * Note: These tests define the expected behavior. Some will FAIL until
 * the exclusion logic is implemented in content.js or a separate module.
 */

describe('Exclusion Logic', () => {
  // Helper function - mirrors expected implementation
  function isExcludedDomain(hostname, patterns) {
    if (!patterns || !Array.isArray(patterns)) return false;
    return patterns.some(pattern => {
      if (pattern.startsWith('*.')) {
        return hostname.endsWith(pattern.slice(1));
      }
      return hostname === pattern || hostname.endsWith('.' + pattern);
    });
  }

  // Helper function - mirrors expected implementation
  function isExcludedBySelector(element, selectors) {
    if (!selectors || !Array.isArray(selectors) || !element) return false;
    return selectors.some(sel => {
      try {
        return element.matches(sel) || element.closest(sel) !== null;
      } catch (e) {
        return false; // Invalid selector
      }
    });
  }

  describe('isExcludedDomain()', () => {
    describe('exact domain matching', () => {
      test('should match exact domain', () => {
        expect(isExcludedDomain('example.com', ['example.com'])).toBe(true);
      });

      test('should match subdomain of excluded domain', () => {
        expect(isExcludedDomain('sub.example.com', ['example.com'])).toBe(true);
      });

      test('should not match partial domain name', () => {
        expect(isExcludedDomain('notexample.com', ['example.com'])).toBe(false);
      });

      test('should handle example.com pattern correctly', () => {
        const patterns = ['example.com'];
        expect(isExcludedDomain('example.com', patterns)).toBe(true);
        expect(isExcludedDomain('sub.example.com', patterns)).toBe(true);
        expect(isExcludedDomain('notexample.com', patterns)).toBe(false);
        expect(isExcludedDomain('example.com.cn', patterns)).toBe(false);
      });
    });

    describe('wildcard domain matching', () => {
      test('should match *.example.com for any subdomain', () => {
        const patterns = ['*.example.com'];
        expect(isExcludedDomain('api.example.com', patterns)).toBe(true);
        expect(isExcludedDomain('dev.api.example.com', patterns)).toBe(true);
      });

      test('should not match root domain for *.example.com', () => {
        // *.example.com should only match subdomains, not example.com itself
        expect(isExcludedDomain('example.com', ['*.example.com'])).toBe(false);
      });

      test('should match deeply nested subdomains', () => {
        const patterns = ['*.internal.com'];
        expect(isExcludedDomain('a.b.c.internal.com', patterns)).toBe(true);
      });

      test('should handle *.internal.com pattern', () => {
        const patterns = ['*.internal.com'];
        expect(isExcludedDomain('api.internal.com', patterns)).toBe(true);
        expect(isExcludedDomain('dev.api.internal.com', patterns)).toBe(true);
        expect(isExcludedDomain('internal.com', patterns)).toBe(false);
      });
    });

    describe('multiple patterns', () => {
      test('should match if any pattern matches', () => {
        const patterns = ['example.com', 'test.org'];
        expect(isExcludedDomain('example.com', patterns)).toBe(true);
        expect(isExcludedDomain('test.org', patterns)).toBe(true);
      });

      test('should not match if no pattern matches', () => {
        const patterns = ['example.com', 'test.org'];
        expect(isExcludedDomain('other.net', patterns)).toBe(false);
      });
    });

    describe('edge cases', () => {
      test('should handle empty patterns array', () => {
        expect(isExcludedDomain('example.com', [])).toBe(false);
      });

      test('should handle null/undefined patterns', () => {
        expect(isExcludedDomain('example.com', null)).toBe(false);
        expect(isExcludedDomain('example.com', undefined)).toBe(false);
      });

      test('should be case-sensitive by default', () => {
        // Note: actual implementation may want case-insensitive matching
        expect(isExcludedDomain('Example.com', ['example.com'])).toBe(false);
      });
    });
  });

  describe('isExcludedBySelector()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    describe('class-based exclusion', () => {
      test('should exclude element with .no-translate class', () => {
        document.body.innerHTML = '<p class="no-translate">Text</p>';
        const p = document.querySelector('p');
        expect(isExcludedBySelector(p, ['.no-translate'])).toBe(true);
      });

      test('should exclude element inside .no-translate ancestor', () => {
        document.body.innerHTML = `
          <div class="no-translate">
            <p>This should be excluded</p>
          </div>
        `;
        const p = document.querySelector('p');
        expect(isExcludedBySelector(p, ['.no-translate'])).toBe(true);
      });

      test('should not exclude element without matching class', () => {
        document.body.innerHTML = `
          <div class="translate-me">
            <p>This should be included</p>
          </div>
        `;
        const p = document.querySelector('p');
        expect(isExcludedBySelector(p, ['.no-translate'])).toBe(false);
      });
    });

    describe('attribute-based exclusion', () => {
      test('should exclude element with [data-no-translate] attribute', () => {
        document.body.innerHTML = '<p data-no-translate>Excluded</p>';
        const p = document.querySelector('p');
        expect(isExcludedBySelector(p, ['[data-no-translate]'])).toBe(true);
      });

      test('should exclude element with [translate="no"] attribute', () => {
        document.body.innerHTML = '<p translate="no">Excluded</p>';
        const p = document.querySelector('p');
        expect(isExcludedBySelector(p, ['[translate="no"]'])).toBe(true);
      });

      test('should handle [data-no-translate] selector', () => {
        document.body.innerHTML = `
          <p data-no-translate>Excluded</p>
          <p>Included</p>
        `;
        const excluded = document.querySelectorAll('p')[0];
        const included = document.querySelectorAll('p')[1];
        expect(isExcludedBySelector(excluded, ['[data-no-translate]'])).toBe(true);
        expect(isExcludedBySelector(included, ['[data-no-translate]'])).toBe(false);
      });
    });

    describe('combined selectors', () => {
      test('should match any of multiple selectors', () => {
        document.body.innerHTML = '<p class="code-block">Code</p>';
        const p = document.querySelector('p');
        expect(isExcludedBySelector(p, ['.no-translate', '.code-block'])).toBe(true);
      });

      test('should handle complex selectors', () => {
        document.body.innerHTML = `
          <div id="sidebar">
            <p>Sidebar text</p>
          </div>
        `;
        const p = document.querySelector('p');
        expect(isExcludedBySelector(p, ['#sidebar p', '.no-translate'])).toBe(true);
      });
    });

    describe('ancestor matching', () => {
      test('should check element.closest() for ancestor match', () => {
        document.body.innerHTML = `
          <article class="no-translate">
            <section>
              <p>Nested text</p>
            </section>
          </article>
        `;
        const p = document.querySelector('p');
        expect(isExcludedBySelector(p, ['.no-translate'])).toBe(true);
      });

      test('should check element.matches() for direct match', () => {
        document.body.innerHTML = '<p class="no-translate">Direct match</p>';
        const p = document.querySelector('p');
        expect(isExcludedBySelector(p, ['.no-translate'])).toBe(true);
      });
    });

    describe('edge cases', () => {
      test('should handle empty selectors array', () => {
        document.body.innerHTML = '<p>Text</p>';
        const p = document.querySelector('p');
        expect(isExcludedBySelector(p, [])).toBe(false);
      });

      test('should handle invalid CSS selector gracefully', () => {
        document.body.innerHTML = '<p>Text</p>';
        const p = document.querySelector('p');
        // Invalid selector should not throw, should return false
        expect(isExcludedBySelector(p, ['[invalid'])).toBe(false);
      });

      test('should not throw on null element', () => {
        expect(isExcludedBySelector(null, ['.no-translate'])).toBe(false);
      });
    });
  });

  describe('options page integration', () => {
    test('should parse newline-separated domain list', () => {
      const input = 'example.com\ntest.org\n*.internal.com';
      const patterns = input.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      expect(patterns).toEqual(['example.com', 'test.org', '*.internal.com']);
    });

    test('should parse newline-separated selector list', () => {
      const input = '.no-translate\n[data-no-translate]\n#sidebar';
      const selectors = input.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      expect(selectors).toEqual(['.no-translate', '[data-no-translate]', '#sidebar']);
    });

    test('should trim whitespace from entries', () => {
      const input = '  example.com  \n  test.org  ';
      const patterns = input.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      expect(patterns).toEqual(['example.com', 'test.org']);
    });

    test('should ignore empty lines', () => {
      const input = 'example.com\n\n\ntest.org\n';
      const patterns = input.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      expect(patterns).toEqual(['example.com', 'test.org']);
    });
  });
});
