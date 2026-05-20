import { AtpAgent, RichText } from '@atproto/api';
import { TipTapNode } from '@postybirb/types';
import { v4 } from 'uuid';
import { PlainTextConverter } from '../../../post-parsers/models/description-node/converters/plaintext-converter';
import { ConversionContext } from '../../../post-parsers/models/description-node/description-node.base';

export class BlueskyConverter extends PlainTextConverter {
  static async getRichText(
    description: string,
    agent = new AtpAgent({ service: 'https://bsky.social' }),
  ) {
    const { text, links } = JSON.parse(description) as DescriptionWithLinks;
    const rt = new RichText({ text });
    await rt.detectFacets(agent);

    // Convert UTF-16 indices to UTF-8 byte offsets
    if (links && links.length > 0) {
      const encoder = new TextEncoder();

      // Encode the entire text once for efficiency
      const textBytes = encoder.encode(text);

      const byteLinks = links.map((link) => {
        const startSlice = text.slice(0, link.start);
        const startByte = encoder.encode(startSlice).byteLength;

        const endSlice = text.slice(0, link.end);
        const endByte = encoder.encode(endSlice).byteLength;

        return {
          start: startByte,
          end: endByte,
          href: link.href,
        };
      });

      rt.facets ??= [];

      for (const byteLink of byteLinks) {
        // Skip if the byte range is invalid
        if (
          byteLink.start >= byteLink.end ||
          byteLink.end > textBytes.byteLength
        ) {
          continue;
        }

        // Check for overlaps with existing facets
        // Links take lower priority then hashtags and mentions, so if latter exists
        // link are discarded
        const hasOverlap = rt.facets.some(
          (facet) =>
            byteLink.start < facet.index.byteEnd &&
            byteLink.end > facet.index.byteStart,
        );

        if (!hasOverlap) {
          rt.facets.push({
            index: {
              byteStart: byteLink.start,
              byteEnd: byteLink.end,
            },
            features: [
              {
                $type: 'app.bsky.richtext.facet#link',
                uri: byteLink.href,
              },
            ],
          });
        }
      }

      // Sort facets
      if (rt.facets.length > 0) {
        rt.facets.sort((a, b) => a.index.byteStart - b.index.byteStart);
      } else {
        rt.facets = undefined;
      }
    }

    return rt;
  }

  private links: { href: string; content: string; id: string }[] = [];

  /**
   * Override text node conversion to intercept link marks.
   */
  convertTextNode(node: TipTapNode, context: ConversionContext): string {
    const marks = node.marks ?? [];
    const linkMark = marks.find((m) => m.type === 'link');

    // Its expected that we add links even for the bsky mentions (e.g. @name.bsky.social)
    // because in BlueskyConverter.getRichText they have lower priority then other mentions
    if (linkMark) {
      // Get the plain text (without the link URL appended)
      const content = node.text ?? '';
      const id = v4();
      this.links.push({
        href: linkMark.attrs?.href ?? '',
        content,
        id,
      });
      return id;
    }

    return super.convertTextNode(node, context);
  }

  convert(nodes: TipTapNode[], context: ConversionContext): string {
    this.links = [];
    let text = super.convert(nodes, context);

    const newLinks: RichTextLinkPosition[] = [];

    for (const link of this.links) {
      const start = text.indexOf(link.id);
      const end = start + link.content.length;
      text = text.replace(link.id, link.content);
      newLinks.push({ start, end, href: link.href });
    }

    return JSON.stringify({
      text,
      links: newLinks,
    } satisfies DescriptionWithLinks);
  }
}
interface RichTextLinkPosition {
  start: number;
  end: number;
  href: string;
}
interface DescriptionWithLinks {
  text: string;
  links: RichTextLinkPosition[];
}
