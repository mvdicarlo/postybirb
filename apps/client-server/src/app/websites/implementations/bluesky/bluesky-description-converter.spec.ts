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
});
