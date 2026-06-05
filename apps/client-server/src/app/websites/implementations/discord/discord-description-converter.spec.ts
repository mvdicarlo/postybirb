import { ConversionContext } from '../../../post-parsers/models/description-node/description-node.base';
import { DiscordDescriptionConverter } from './discord-description-converter';

describe('DiscordDescriptionConverter', () => {
  const defaultContext: ConversionContext = {
    shortcuts: {},
    website: 'test',
    customShortcuts: new Map(),
    defaultDescription: [],
  };

  it('should convert links', () => {
    expect(
      new DiscordDescriptionConverter().convert(
        [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Visit ' },
              {
                type: 'text',
                text: 'PostyBirb',
                marks: [
                  { type: 'link', attrs: { href: 'https://postybirb.com' } },
                ],
              },
            ],
          },
        ],

        defaultContext,
      ),
    ).toMatchInlineSnapshot(`"Visit [PostyBirb](https://postybirb.com)"`);
  });

  it('should convert links', () => {
    expect(
      new DiscordDescriptionConverter().convert(
        [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Visit ' },
              {
                type: 'text',
                text: 'https://postybirb.com',
                marks: [
                  { type: 'link', attrs: { href: 'https://postybirb.com' } },
                ],
              },
            ],
          },
        ],

        defaultContext,
      ),
    ).toMatchInlineSnapshot(`"Visit https://postybirb.com"`);
  });

  it('should not escape _', () => {
    expect(
      new DiscordDescriptionConverter().convert(
        [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '<:emoji_with_underscores:14>' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: ':emoji_with_underscores:' }],
          },
        ],

        defaultContext,
      ),
    ).toMatchInlineSnapshot(`
      "<:emoji_with_underscores:14>

      :emoji_with_underscores:"
    `);
  });
});
