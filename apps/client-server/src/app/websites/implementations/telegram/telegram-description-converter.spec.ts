import { TelegramConverter } from './telegram-description-converter';

describe('TelegramDescriptionConverter', () => {
  it('keeps special characters', () => {
    const a = new TelegramConverter().convert(
      [
        {
          content: [
            {
              text: '\' & < <inside/> and & with " © ® ™',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
      ],
      {
        customShortcuts: new Map(),
        defaultDescription: [],
        shortcuts: {},
        website: '',
      },
    );
    expect(a).toMatchInlineSnapshot(
      `"{"html":"<div>&apos; &amp; &lt; &lt;inside/&gt; and &amp; with &quot; © ® ™</div>","rendered":"&#x27; &amp; &lt; &lt;inside/&gt; and &amp; with &quot; © ® ™"}"`,
    );
    expect(TelegramConverter.fromJson(a)[0]).toMatchInlineSnapshot(
      `"' & < <inside/> and & with " © ® ™"`,
    );
  });
});
