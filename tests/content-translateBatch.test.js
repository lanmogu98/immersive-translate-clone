const { DOMUtils } = require('../src/utils/dom-utils.js');

global.DOMUtils = DOMUtils;

const { translateBatch } = require('../src/content.js');

describe('content translateBatch (stream parser)', () => {
  test('splits streamed output by %% and routes paragraphs to the correct nodes', async () => {
    document.body.innerHTML = `
      <p id="a">Paragraph one is long enough.</p>
      <p id="b">Paragraph two is also long enough.</p>
    `;

    const a = document.getElementById('a');
    const b = document.getElementById('b');

    const llmClient = {
      translateStream: (text, onChunk, onError, onDone) => {
        // Ensure we are batching with the immersive protocol separator
        expect(text).toContain('%%');
        onChunk('你好');
        onChunk('%%');
        onChunk('世界');
        onDone();
      },
    };

    await translateBatch(
      [
        { element: a, text: a.textContent },
        { element: b, text: b.textContent },
      ],
      llmClient
    );

    const aNode = a.querySelector(':scope > .immersive-translate-target');
    const bNode = b.querySelector(':scope > .immersive-translate-target');

    expect(aNode).not.toBeNull();
    expect(bNode).not.toBeNull();
    expect(aNode.textContent).toBe('你好');
    expect(bNode.textContent).toBe('世界');
  });

  test('does not flash a stray % when %% is split across chunks', async () => {
    document.body.innerHTML = `
      <p id="a">Paragraph one is long enough.</p>
      <p id="b">Paragraph two is also long enough.</p>
    `;

    const a = document.getElementById('a');
    const b = document.getElementById('b');

    const llmClient = {
      translateStream: (text, onChunk, onError, onDone) => {
        onChunk('First%');
        onChunk('%Second');
        onDone();
      },
    };

    await translateBatch(
      [
        { element: a, text: a.textContent },
        { element: b, text: b.textContent },
      ],
      llmClient
    );

    const aNode = a.querySelector(':scope > .immersive-translate-target');
    const bNode = b.querySelector(':scope > .immersive-translate-target');

    expect(aNode.textContent).toBe('First');
    expect(bNode.textContent).toBe('Second');
  });
});


