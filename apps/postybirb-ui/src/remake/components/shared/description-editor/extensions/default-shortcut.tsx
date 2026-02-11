/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/react/macro';
import { Badge } from '@mantine/core';
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
        variant="outline"
        radius="xs"
        tt="none"
        size="sm"
        color="gray"
        style={{ fontFamily: 'monospace', fontSize: '12px' }}
        contentEditable={false}
      >
        <Trans>Default</Trans>
        <span style={{ paddingLeft: '6px', fontWeight: 'bold', fontSize: '14px' }}>→</span>
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
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { only: attrs?.only ?? '' },
          });
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});
