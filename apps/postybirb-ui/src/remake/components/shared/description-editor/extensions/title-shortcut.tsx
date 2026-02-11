/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/react/macro';
import { Badge } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useCallback } from 'react';
import { WebsiteOnlySelector } from '../custom-blocks/website-only-selector';

/**
 * React component rendered inside the editor for the TitleShortcut inline node.
 */
function TitleShortcutView({
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
        color="blue"
        contentEditable={false}
        styles={{ label: { display: 'flex', alignItems: 'center', gap: 4 } }}
      >
        <span style={{ fontWeight: 600 }}><Trans>Title</Trans></span>
        <IconArrowRight size={12} style={{ opacity: 0.5 }} />
        <WebsiteOnlySelector only={node.attrs.only} onOnlyChange={handleOnlyChange} />
      </Badge>
    </NodeViewWrapper>
  );
}

/**
 * TipTap Node extension for the Title system shortcut.
 * Renders as a blue badge; resolved to the submission title at parse time.
 */
export const TitleShortcutExtension = Node.create({
  name: 'titleShortcut',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      only: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="titleShortcut"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'titleShortcut' })];
  },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ReactNodeViewRenderer(TitleShortcutView as any);
  },

  addCommands() {
    return {
      insertTitleShortcut:
        (attrs?: { only?: string }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: { commands: any }) => {
          return commands.insertContent([
            { type: this.name, attrs: { only: attrs?.only ?? '' } },
            { type: 'text', text: ' ' },
          ]);
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});
