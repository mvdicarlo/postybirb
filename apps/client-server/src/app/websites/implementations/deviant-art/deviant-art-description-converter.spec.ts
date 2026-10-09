import { DeviantArtDescriptionConverter } from './deviant-art-description-converter';

describe('deviant-art description converter', () => {
  it('should convert text with alignment', () => {
    expect(
      DeviantArtDescriptionConverter.htmlToJson(
        '<div>Left</div><div style="text-align: center">Center</div><div style="text-align: right">Right</div>'
      )
    ).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "attrs": {
              "textAlign": null,
            },
            "content": [
              {
                "text": "Left",
                "type": "text",
              },
            ],
            "type": "paragraph",
          },
          {
            "attrs": {
              "textAlign": "center",
            },
            "content": [
              {
                "text": "Center",
                "type": "text",
              },
            ],
            "type": "paragraph",
          },
          {
            "attrs": {
              "textAlign": "right",
            },
            "content": [
              {
                "text": "Right",
                "type": "text",
              },
            ],
            "type": "paragraph",
          },
        ],
        "type": "doc",
      }
    `);
  });
});
