/* eslint-disable lingui/no-unlocalized-strings */
import reactPreset from '@bbob/preset-react';
import BBCode from '@bbob/react';
import { descriptionPreviewRendererByWebsite } from '../../sections/submissions-section/submission-edit-card/account-selection/form/fields/description-preview-panel';

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

  // // Plain URLs: https://example.com
  processed = processed.replace(
    /[^\[]<?(https?:\/\/[^\s<]+)>?[^\]]/g,
    (match) => `[url]${match}[/url]`,
  );

  // Hyperlinks: "A link":[https://example.com]
  processed = processed.replace(
    /"([^"]+)":\[([^\]]+)\]/g,
    (_, title, url) => `[url=${url}]${title}[/url]`,
  );

  // // Hyperlinks: "A link":https://example.com
  // processed = processed.replace(
  //   /"([^"]+)":([^\s]+)/g,
  //   (_, title, url) => `[url=${url}]${title}[/url]`,
  // );

  // Custom header format to bbcode (h1. to [h1][/h1])
  processed = processed.replace(
    /^(h[1-6])\.\s+(.*)$/gim,
    (_, tag, content) => `[${tag}]${content}[/${tag}]`,
  );

  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      <BBCode plugins={[dtextPreset()]} options={{ onlyAllowTags: undefined }}>
        {processed}
      </BBCode>
    </div>
  );
}

descriptionPreviewRendererByWebsite.set('e621', ({ description }) => (
  <E621Dtext dtext={description} />
));
