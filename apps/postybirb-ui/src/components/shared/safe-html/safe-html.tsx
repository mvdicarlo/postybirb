/* eslint-disable lingui/no-unlocalized-strings */
import sanitizeHtml from 'sanitize-html';

const tiptapBlockAttributes: sanitizeHtml.AllowedAttribute[] = [
  'data-indent',
  'style',
];

const tiptapBlockStyles = {
  'text-align': [/^(?:left|center|right|justify)$/],
  'margin-left': [/^(?:2|4|6|8|10|12)em$/],
};

const transformTiptapBlock: sanitizeHtml.Transformer = (
  tagName,
  attributes,
) => {
  const attribs = { ...attributes };
  if (!/^[1-6]$/.test(attribs['data-indent'] ?? '')) {
    delete attribs['data-indent'];
  }
  return { tagName, attribs };
};

const options: sanitizeHtml.IOptions = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
    p: tiptapBlockAttributes,
    h1: tiptapBlockAttributes,
    h2: tiptapBlockAttributes,
    h3: tiptapBlockAttributes,
    span: ['class', 'style'],
  },
  allowedClasses: {
    span: ['mention'],
  },
  allowedStyles: {
    p: tiptapBlockStyles,
    h1: tiptapBlockStyles,
    h2: tiptapBlockStyles,
    h3: tiptapBlockStyles,
    span: {
      color: [
        /^#[0-9a-f]{3,8}$/i,
        /^var\(--mantine-(?:primary-color-filled|color-[a-z]+-[0-9]+)\)$/,
      ],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  nestingLimit: 30,
  transformTags: {
    p: transformTiptapBlock,
    h1: transformTiptapBlock,
    h2: transformTiptapBlock,
    h3: transformTiptapBlock,
    a: (tagName, attributes) => ({
      tagName,
      attribs:
        attributes.target === '_blank'
          ? { ...attributes, rel: 'noopener noreferrer' }
          : attributes,
    }),
  },
};

export function sanitizeRenderedHtml(html: string): string {
  return sanitizeHtml(html, options);
}

export function SafeHtml({ html }: { html: string }) {
  // eslint-disable-next-line react/no-danger
  return <div dangerouslySetInnerHTML={{ __html: sanitizeRenderedHtml(html) }} />;
}