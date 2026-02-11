/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/react/macro';
import { Badge } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useCallback } from 'react';
import { WebsiteOnlySelector } from '../custom-blocks/website-only-selector';

/**
 * React component rendered inside the editor for the DefaultShortcut node.
 */
function DefaultShortcutView({
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
    <NodeViewWrapper as="div" className="default-shortcut-container" style={{ padding: '4px 0' }}>
      <Badge
        variant="light"
        radius="xl"
        tt="none"
        size="sm"
        color="gray"
        contentEditable={false}
        styles={{ label: { display: 'flex', alignItems: 'center', gap: 4 } }}
      >
        <span style={{ fontWeight: 600 }}><Trans>Default</Trans></span>
        <IconArrowRight size={12} style={{ opacity: 0.5 }} />
        <WebsiteOnlySelector only={node.attrs.only} onOnlyChange={handleOnlyChange} />
      </Badge>
    </NodeViewWrapper>
  );
}

/**
 * TipTap Node extension for the "Default Description" block shortcut.
 * Renders as a non-editable badge that expands to the default description at parse time.
 */
export const DefaultShortcutExtension = Node.create({
  name: 'defaultShortcut',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      only: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="defaultShortcut"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'defaultShortcut' }), 0];
  },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ReactNodeViewRenderer(DefaultShortcutView as any);
  },

  addCommands() {
    return {
      setDefaultShortcut:
        (attrs?: { only?: string }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: { commands: any }) => commands.insertContent({
            type: this.name,
            attrs: { only: attrs?.only ?? '' },
          }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});
