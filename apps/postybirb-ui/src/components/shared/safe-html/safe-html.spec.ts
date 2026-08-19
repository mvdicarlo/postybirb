import { sanitizeRenderedHtml } from './safe-html';

describe('sanitizeRenderedHtml', () => {
  it('removes executable markup and unsafe attributes', () => {
    const html = sanitizeRenderedHtml(
      '<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)" onclick="alert(1)">link</a>',
    );

    expect(html).toBe('<img src="x" /><a>link</a>');
  });

  it('preserves supported preview formatting and secures new tabs', () => {
    const html = sanitizeRenderedHtml(
      '<strong>Bold</strong><br><span class="mention" style="color:#aabbcc;position:fixed">Name</span><a href="https://example.com" target="_blank">link</a>',
    );

    expect(html).toBe(
      '<strong>Bold</strong><br /><span class="mention" style="color:#aabbcc">Name</span><a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>',
    );
  });

  it('preserves constrained Tiptap alignment and indentation', () => {
    const html = sanitizeRenderedHtml(
      '<h2 style="text-align:center;position:fixed">Heading</h2><p data-indent="3" style="margin-left:6em">Indented</p><p data-indent="99" style="margin-left:198em">Invalid</p>',
    );

    expect(html).toBe(
      '<h2 style="text-align:center">Heading</h2><p data-indent="3" style="margin-left:6em">Indented</p><p>Invalid</p>',
    );
  });
});