/* eslint-disable lingui/no-unlocalized-strings */
import { Badge } from '@mantine/core';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useCallback, useMemo } from 'react';
import { useCustomShortcuts } from '../../../../stores';
import { WebsiteOnlySelector } from '../custom-blocks/website-only-selector';

/**
 * React component rendered inside the editor for the CustomShortcut inline node.
 */
function CustomShortcutView({
  node,
  updateAttributes,
}: {
  node: { attrs: { id: string; only: string } };
  updateAttributes: (attrs: Record<string, unknown>) => void;
}) {
  const shortcuts = useCustomShortcuts();

  const shortcut = useMemo(() => {
    if (!node.attrs.id) return undefined;
    return shortcuts?.find((s) => s.id === node.attrs.id);
  }, [shortcuts, node.attrs.id]);

  const name = shortcut?.name ?? node.attrs.id;

  const handleOnlyChange = useCallback(
    (newOnly: string) => {
      updateAttributes({ only: newOnly });
    },
    [updateAttributes],
  );

  return (
    <NodeViewWrapper as="span" className="custom-shortcut-container" style={{ verticalAlign: 'text-bottom' }}>
      <Badge
        variant="outline"
        radius="xs"
        size="sm"
        tt="none"
        color="grape"
        contentEditable={false}
      >
        {name}
        <span style={{ paddingLeft: '6px', fontWeight: 'bold', fontSize: '14px' }}>→</span>
        <WebsiteOnlySelector only={node.attrs.only} onOnlyChange={handleOnlyChange} />
      </Badge>
    </NodeViewWrapper>
  );
}

/**
 * TipTap Node extension for custom shortcut inline nodes.
 * Renders as a grape-colored badge showing the shortcut name.
 */
export const CustomShortcutExtension = Node.create({
  name: 'customShortcut',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: '' },
      only: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="customShortcut"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'customShortcut' })];
  },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ReactNodeViewRenderer(CustomShortcutView as any);
  },

  addCommands() {
    return {
      insertCustomShortcut:
        (attrs: { id: string; only?: string }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: { commands: any }) => {
          return commands.insertContent([
            { type: this.name, attrs: { id: attrs.id, only: attrs.only ?? '' } },
            { type: 'text', text: ' ' },
          ]);
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  },
});
