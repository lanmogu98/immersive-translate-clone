describe('richtext v2 (token protocol)', () => {
  const { RichTextV2 } = require('../src/utils/richtext-v2.js');

  test('tokenize: preserves href and extracts atomic footnote token', () => {
    document.body.innerHTML = `
      <p id="p">
        Sutton attended <a href="/wiki/Brenham">Brenham</a><sup class="reference"><a href="#cite_note-1">[1]</a></sup>.
      </p>
    `;
    const p = document.getElementById('p');

    const t = RichTextV2.tokenizeElement(p);
    expect(t.marker).toBe('[[ITC_RICH_V2]]');
    expect(t.text).toContain('[[ITC:a0]]');
    expect(t.text).toContain('[[/ITC:a0]]');
    expect(t.text).toContain('[[ITC:ref0]]');
    expect(t.tokenMap.a0).toBeDefined();
    expect(t.tokenMap.a0.clone.getAttribute('href')).toBe('/wiki/Brenham');
    expect(t.tokenMap.ref0).toBeDefined();
    expect(t.tokenMap.ref0.clone.querySelector('a').getAttribute('href')).toBe('#cite_note-1');
  });

  test('render: allows reordering token blocks while keeping DOM nodes', () => {
    document.body.innerHTML = `
      <p id="p">
        Sutton attended <a href="/wiki/Brenham">Brenham</a><sup class="reference"><a href="#cite_note-1">[1]</a></sup>.
      </p>
    `;
    const p = document.getElementById('p');
    const t = RichTextV2.tokenizeElement(p);

    // Model reorders: move the link earlier and keep footnote atomic token
    const out = `他就读于[[ITC:a0]]布伦汉姆[[/ITC:a0]]高中[[ITC:ref0]]。`;

    const root = document.createElement('span');
    const ok = RichTextV2.renderToNode(root, t, out);
    expect(ok).toBe(true);
    expect(root.textContent).toContain('他就读于');
    expect(root.textContent).toContain('布伦汉姆');
    const link = root.querySelector('a');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/wiki/Brenham');
    const sup = root.querySelector('sup.reference');
    expect(sup).not.toBeNull();
    expect(sup.querySelector('a').getAttribute('href')).toBe('#cite_note-1');
  });

  test('render fallback: missing tokens returns false and does not mutate node', () => {
    document.body.innerHTML = `<p id="p">Hello <a href="/x">world</a>.</p>`;
    const p = document.getElementById('p');
    const t = RichTextV2.tokenizeElement(p);

    const root = document.createElement('span');
    root.textContent = 'keep';
    const ok = RichTextV2.renderToNode(root, t, '你好 world'); // missing [[ITC:a0]]...
    expect(ok).toBe(false);
    expect(root.textContent).toBe('keep');
  });
});

