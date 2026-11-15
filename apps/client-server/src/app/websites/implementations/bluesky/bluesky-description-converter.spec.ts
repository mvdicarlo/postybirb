import { BlueskyConverter } from './bluesky-description-converter';

describe('BlueskyDescriptionConverter', () => {
  it('should convert links', async () => {
    expect(
      (
        await BlueskyConverter.getRichText(
          '{"text":"Text @nonexistentmentionwithwrongid.bluesky.social!","links":[]}',
        )
      ).facets,
    ).toMatchInlineSnapshot(`
      [
        {
          "$type": "app.bsky.richtext.facet",
          "features": [
            {
              "$type": "app.bsky.richtext.facet#mention",
              "did": "",
            },
          ],
          "index": {
            "byteEnd": 50,
            "byteStart": 5,
          },
        },
      ]
    `);
  });

  it('should separate paragraphs with a blank line and keep link positions', () => {
    const { text, links } = JSON.parse(
      new BlueskyConverter({ paragraphSpacing: true }).convert(
        [
          { type: 'paragraph', content: [{ type: 'text', text: 'Hey!' }] },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'My site',
                marks: [
                  { type: 'link', attrs: { href: 'https://postybirb.com' } },
                ],
              },
            ],
          },
        ],
        {
          website: 'bluesky',
          shortcuts: {},
          customShortcuts: new Map(),
          defaultDescription: [],
        },
      ),
    );

    expect(text).toBe('Hey!\r\n\r\nMy site');
    expect(links).toEqual([
      { start: 8, end: 15, href: 'https://postybirb.com' },
    ]);
  });
});
