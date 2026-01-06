const { DOMUtils } = require('../src/utils/dom-utils.js');

describe('DOMUtils.showError', () => {
  test('renders error text and marks node as error (clears loading spinner)', () => {
    document.body.innerHTML = '<p id="p">Hello world, this is long enough.</p>';
    const p = document.getElementById('p');

    const node = DOMUtils.injectTranslationNode(p);
    expect(node.querySelector('.immersive-translate-loading')).not.toBeNull();

    DOMUtils.showError(node, 'boom');

    expect(node.textContent).toBe('[Error: boom]');
    expect(node.classList.contains('immersive-translate-error')).toBe(true);
    expect(node.querySelector('.immersive-translate-loading')).toBeNull();
  });
});


