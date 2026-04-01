/* eslint-disable lingui/no-unlocalized-strings */
import reactPreset from '@bbob/preset-react';
import BBCode from '@bbob/react';

// ----------------------------------------------------------------------
// Custom preset that extends the default React preset with DText‑specific tags
// ----------------------------------------------------------------------
const dtextPreset = reactPreset.extend((tags, options) => ({
  ...tags,
  // Render [spoiler] as a <details> block
  spoiler: (node) => {
    const content = Array.isArray(node.content)
      ? node.content
      : node.content
        ? [node.content]
        : [];
    return {
      tag: 'details',
      content: [{ tag: 'summary', content: 'Spoiler' }, ...content],
    };
  },
}));

// ----------------------------------------------------------------------
// React component
// ----------------------------------------------------------------------
export interface E621DtextProps {
  dtext: string;
}

export function E621Dtext({ dtext }: E621DtextProps) {
  let processed = dtext;

  // 1. Plain URLs: https://example.com
  processed = processed.replace(
    /(https?:\/\/[^\s<]+)/g,
    (match) => `[url]${match}[/url]`,
  );

  // 2. Angle-bracketed URLs: <https://example.com/link_(test)>
  processed = processed.replace(
    /<((https?:\/\/)[^>]+)>/g,
    (_, url) => `[url]${url}[/url]`,
  );

  // 3. Custom title links: "A link":https://example.com
  processed = processed.replace(
    /"([^"]+)":([^\s\]]+)/g,
    (_, title, url) => `[url=${url}]${title}[/url]`,
  );

  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      <BBCode plugins={[dtextPreset()]} options={{ onlyAllowTags: undefined }}>
        {processed}
      </BBCode>
    </div>
  );
}
