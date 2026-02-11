/* eslint-disable lingui/no-unlocalized-strings */
import { Extension } from '@tiptap/core';

export interface IndentOptions {
  /** Node types that support indentation. */
  types: string[];
  /** Minimum indent level. */
  minLevel: number;
  /** Maximum indent level. */
  maxLevel: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

/**
 * TipTap extension that adds indent/outdent support to paragraphs and headings.
 * Stores an integer `indent` attribute (0–6) on supported block nodes and renders
 * it as a `margin-left` style. Tab / Shift+Tab keyboard shortcuts are included
 * but only fire when the selection is NOT inside a list (lists handle Tab natively).
 */
export const Indent = Extension.create<IndentOptions>({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      minLevel: 0,
      maxLevel: 6,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const level = parseInt(element.getAttribute('data-indent') || '0', 10);
              return Math.min(Math.max(level, this.options.minLevel), this.options.maxLevel);
            },
            renderHTML: (attributes) => {
              if (!attributes.indent || attributes.indent <= 0) {
                return {};
              }
              return {
                'data-indent': attributes.indent,
                style: `margin-left: ${attributes.indent * 2}em`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          let applied = false;

          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentLevel = (node.attrs.indent as number) || 0;
              const newLevel = Math.min(currentLevel + 1, this.options.maxLevel);
              if (newLevel !== currentLevel) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: newLevel,
                });
                applied = true;
              }
            }
          });

          if (applied && dispatch) {
            dispatch(tr);
          }
          return applied;
        },

      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          let applied = false;

          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentLevel = (node.attrs.indent as number) || 0;
              const newLevel = Math.max(currentLevel - 1, this.options.minLevel);
              if (newLevel !== currentLevel) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: newLevel,
                });
                applied = true;
              }
            }
          });

          if (applied && dispatch) {
            dispatch(tr);
          }
          return applied;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        // Don't handle Tab in lists — let the list extension handle nesting
        if (editor.isActive('listItem')) {
          return false;
        }
        return editor.commands.indent();
      },
      'Shift-Tab': ({ editor }) => {
        if (editor.isActive('listItem')) {
          return false;
        }
        return editor.commands.outdent();
      },
    };
  },
});
