/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/react/macro';
import { Badge } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useCallback } from 'react';
import { WebsiteOnlySelector } from '../custom-blocks/website-only-selector';

/**
 * React component rendered inside the editor for the TagsShortcut inline node.
 */
function TagsShortcutView({
  node,
  updateAttributes,
}: {
  node: { attrs: { only: string } };
  updateAttributes: (attrs: Record<string, unknown>) => void;
}) {
  const handleOnlyChange = useCallback(
    (newOnly: string) => {
      updateAttributes({ only: newOnly });
    },
    [updateAttributes],
  );

  return (
    <NodeViewWrapper as="span" className="system-shortcut-container" style={{ verticalAlign: 'text-bottom' }}>
      <Badge
        variant="light"
        radius="xl"
        size="sm"
        tt="none"
        color="teal"
        contentEditable={false}
        styles={{ label: { display: 'flex', alignItems: 'center', gap: 4 } }}
      >
        <span style={{ fontWeight: 600 }}><Trans>Tags</Trans></span>
        <IconArrowRight size={12} style={{ opacity: 0.5 }} />
        <WebsiteOnlySelector only={node.attrs.only} onOnlyChange={handleOnlyChange} />
      </Badge>
    </NodeViewWrapper>
  );
}

/**
 * TipTap Node extension for the Tags system shortcut.
 * Renders as a teal badge; resolved to submission tags at parse time.
 */
export const TagsShortcutExtension = Node.create({
  name: 'tagsShortcut',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      only: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="tagsShortcut"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'tagsShortcut' })];
  },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ReactNodeViewRenderer(TagsShortcutView as any);
  },

  addCommands() {
    return {
      insertTagsShortcut:
        (attrs?: { only?: string }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: { commands: any }) => commands.insertContent([
            { type: this.name, attrs: { only: attrs?.only ?? '' } },
            { type: 'text', text: ' ' },
          ]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});
