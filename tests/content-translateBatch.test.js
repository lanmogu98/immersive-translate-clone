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

describe('content translateBatch (error handling)', () => {
  test('does not mark nodes with existing content as error when timeout occurs', async () => {
    document.body.innerHTML = `
      <p id="a">Paragraph one is long enough.</p>
      <p id="b">Paragraph two is also long enough.</p>
    `;

    const a = document.getElementById('a');
    const b = document.getElementById('b');

    const llmClient = {
      translateStream: (text, onChunk, onError, onDone) => {
        // Simulate streaming content before error
        onChunk('翻译内容一');
        onChunk('%%');
        onChunk('翻译内容二');
        // Then timeout error occurs
        onError('Request timed out. Please try again.');
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

    // Nodes with content should NOT have error class
    expect(aNode.textContent).toBe('翻译内容一');
    expect(aNode.classList.contains('immersive-translate-error')).toBe(false);

    expect(bNode.textContent).toBe('翻译内容二');
    expect(bNode.classList.contains('immersive-translate-error')).toBe(false);
  });

  test('shows error on nodes without content when fatal error occurs', async () => {
    document.body.innerHTML = `
      <p id="a">Paragraph one is long enough.</p>
    `;

    const a = document.getElementById('a');

    const llmClient = {
      translateStream: (text, onChunk, onError, onDone) => {
        // Fatal error (not timeout/rate limit) occurs immediately without any content
        onError('Invalid API key');
      },
    };

    await translateBatch(
      [{ element: a, text: a.textContent }],
      llmClient
    );

    const aNode = a.querySelector(':scope > .immersive-translate-target');

    // Node without content SHOULD have error class and error message for fatal errors
    expect(aNode.classList.contains('immersive-translate-error')).toBe(true);
    expect(aNode.textContent).toContain('Error');
  });

  test('does not show error for timeout when no content exists (graceful degradation)', async () => {
    document.body.innerHTML = `
      <p id="a">Paragraph one is long enough.</p>
    `;

    const a = document.getElementById('a');

    const llmClient = {
      translateStream: (text, onChunk, onError, onDone) => {
        // Timeout error occurs immediately without any content
        onError('Request timed out. Please try again.');
      },
    };

    await translateBatch(
      [{ element: a, text: a.textContent }],
      llmClient
    );

    const aNode = a.querySelector(':scope > .immersive-translate-target');

    // For recoverable errors (timeout), should NOT show error - better UX
    expect(aNode.classList.contains('immersive-translate-error')).toBe(false);
    expect(aNode.classList.contains('immersive-translate-loading')).toBe(false);
    expect(aNode.textContent).not.toContain('Error');
  });

  test('does not append buffer content after error when both onError and onDone are called', async () => {
    document.body.innerHTML = `
      <p id="a">Paragraph one is long enough.</p>
    `;

    const a = document.getElementById('a');

    const llmClient = {
      translateStream: (text, onChunk, onError, onDone) => {
        // Simulate streaming partial content
        onChunk('部分翻译内容');
        // Then error occurs - in real llm-client, both onError and onDone are called
        onError('Request timed out. Please try again.');
        // onDone is also called (simulating llm-client behavior)
        onDone();
      },
    };

    await translateBatch(
      [{ element: a, text: a.textContent }],
      llmClient
    );

    const aNode = a.querySelector(':scope > .immersive-translate-target');

    // Node already had content before error, so should NOT have error class
    expect(aNode.classList.contains('immersive-translate-error')).toBe(false);
    // Content should be preserved without error message prepended
    expect(aNode.textContent).toBe('部分翻译内容');
    expect(aNode.textContent).not.toContain('Error');
  });

  test('does not append buffer content to error node when fatal error with no prior content', async () => {
    document.body.innerHTML = `
      <p id="a">Paragraph one is long enough.</p>
    `;

    const a = document.getElementById('a');

    const llmClient = {
      translateStream: (text, onChunk, onError, onDone) => {
        // Fatal error occurs immediately without any content
        onError('Invalid API key');
        // onDone is also called (simulating llm-client behavior) with buffer still empty
        onDone();
      },
    };

    await translateBatch(
      [{ element: a, text: a.textContent }],
      llmClient
    );

    const aNode = a.querySelector(':scope > .immersive-translate-target');

    // Should have error class and ONLY error message (no extra content appended)
    expect(aNode.classList.contains('immersive-translate-error')).toBe(true);
    expect(aNode.textContent).toContain('Error');
    // Should not have duplicate or concatenated content
    expect(aNode.textContent).toBe('[Error: Invalid API key]');
  });

  test('flushes buffer content on timeout before deciding node state', async () => {
    document.body.innerHTML = `
      <p id="a">Paragraph one is long enough.</p>
    `;

    const a = document.getElementById('a');

    const llmClient = {
      translateStream: (text, onChunk, onError, onDone) => {
        // Content is in buffer but not yet flushed (no %% separator)
        onChunk('部分翻译内容在buffer中');
        // Then timeout error occurs
        onError('Request timed out. Please try again.');
        onDone();
      },
    };

    await translateBatch(
      [{ element: a, text: a.textContent }],
      llmClient
    );

    const aNode = a.querySelector(':scope > .immersive-translate-target');

    // Buffer content should be flushed BEFORE error handling
    // So node should have content, not error
    expect(aNode.classList.contains('immersive-translate-error')).toBe(false);
    expect(aNode.textContent).toBe('部分翻译内容在buffer中');
    expect(aNode.textContent).not.toContain('Error');
  });
});

describe('content translateBatch (richtext v2 error handling)', () => {
  const { RichTextV2 } = require('../src/utils/richtext-v2.js');
  global.RichTextV2 = RichTextV2;

  test('shows error instead of raw tokens when v2 content is truncated', async () => {
    document.body.innerHTML = `
      <p id="a">
        He preferred <a href="/wiki/Nikki_Haley">Nikki Haley</a> over Trump.
      </p>
    `;
    const a = document.getElementById('a');

    const llmClient = {
      translateStream: (text, onChunk, onError, onDone) => {
        // Simulate truncated v2 content (ends with incomplete token)
        onChunk('[[ITC_RICH_V2]]\n他更倾向于[[ITC:a0]]妮基·黑利[[');
        onDone();
      },
    };

    await translateBatch([{ element: a, text: a.textContent, richText: 'v2' }], llmClient);

    const node = a.querySelector(':scope > .immersive-translate-target');
    expect(node).not.toBeNull();
    // Should NOT show raw tokens
    expect(node.textContent).not.toContain('[[ITC');
    // Should show error
    expect(node.classList.contains('immersive-translate-error')).toBe(true);
  });

  test('shows plain text fallback when v2 render fails but content is complete', async () => {
    document.body.innerHTML = `
      <p id="a">
        He preferred <a href="/wiki/Nikki_Haley">Nikki Haley</a> over Trump.
      </p>
    `;
    const a = document.getElementById('a');

    const llmClient = {
      translateStream: (text, onChunk, onError, onDone) => {
        // V2 content with mismatched tokens (will fail validation)
        // but content is otherwise complete text
        onChunk('[[ITC_RICH_V2]]\n他更倾向于妮基·黑利而非特朗普。');
        onDone();
      },
    };

    await translateBatch([{ element: a, text: a.textContent, richText: 'v2' }], llmClient);

    const node = a.querySelector(':scope > .immersive-translate-target');
    expect(node).not.toBeNull();
    // Should show plain text (tokens stripped)
    expect(node.textContent).toContain('他更倾向于妮基·黑利而非特朗普');
    // Should NOT show raw tokens
    expect(node.textContent).not.toContain('[[ITC');
    // Should NOT be marked as error (content is valid)
    expect(node.classList.contains('immersive-translate-error')).toBe(false);
  });
});

describe('content translateBatch (richtext v2 token protocol)', () => {
  const { RichTextV2 } = require('../src/utils/richtext-v2.js');
  global.RichTextV2 = RichTextV2;

  test('renders translated output with preserved <a href> and footnote <sup.reference>', async () => {
    document.body.innerHTML = `
      <p id="a">
        Sutton attended <a href="/wiki/Brenham">Brenham</a><sup class="reference"><a href="#cite_note-1">[1]</a></sup>.
      </p>
    `;
    const a = document.getElementById('a');

    const llmClient = {
      translateStream: (text, onChunk, onError, onDone) => {
        // Ensure the request uses RichText V2 marker + token syntax
        expect(text).toContain('[[ITC_RICH_V2]]');
        expect(text).toContain('[[ITC:a0]]');
        expect(text).toContain('[[/ITC]]');
        expect(text).toContain('[[ITC:ref0]]');

        onChunk('[[ITC_RICH_V2]]\\n他就读于[[ITC:a0]]布伦汉姆[[/ITC]]高中[[ITC:ref0]]。');
        onDone();
      },
    };

    await translateBatch([{ element: a, text: a.textContent, richText: 'v2' }], llmClient);

    const node = a.querySelector(':scope > .immersive-translate-target');
    expect(node).not.toBeNull();
    const link = node.querySelector('a');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/wiki/Brenham');
    const sup = node.querySelector('sup.reference');
    expect(sup).not.toBeNull();
    expect(sup.querySelector('a').getAttribute('href')).toBe('#cite_note-1');
  });
});


