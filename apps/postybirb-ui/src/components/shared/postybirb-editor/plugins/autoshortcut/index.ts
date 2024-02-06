/* eslint-disable lingui/no-unlocalized-strings */
/* eslint-disable @typescript-eslint/no-explicit-any */
import tinymce, { Editor, EditorSelection } from 'tinymce';

const SHORTCUT_REGEX = () => /\{(\w+)(\[.*\])*:{0,1}(.+)\}/ims;
const SHORTCUT_ELEMENT = 'shortcut';
const WHITESPACE = new RegExp(String.fromCharCode(160), 'g');

/**
 * Shortcut type at the start of the shortcut
 *
 * @param {string} name
 * @return {*}  {string}
 */
function createShortcutName(name: string): string {
  return `<${SHORTCUT_ELEMENT}-name>${name}</${SHORTCUT_ELEMENT}-name>`;
}

/**
 * The optional portion of the shortcut between the name and :
 * {<name>[<attributes>]:<value>}
 *
 * @param {string} [attributes]
 * @return {*}  {string}
 */
function createShortcutAttributes(attributes?: string): string {
  return attributes
    ? `<${SHORTCUT_ELEMENT}-attributes>${attributes}</${SHORTCUT_ELEMENT}-attributes>`
    : '';
}

/**
 *  The portion of the shortcut after the :
 *
 * @param {string} [value]
 * @return {*}  {string}
 */
function createShortcutValue(value?: string): string {
  return value
    ? `:<${SHORTCUT_ELEMENT}-value>${value}</${SHORTCUT_ELEMENT}-value>`
    : '';
}

function createShortcut(
  name: string,
  attributes?: string,
  value?: string
): string {
  const scName = createShortcutName(name);
  const scAttribs = createShortcutAttributes(attributes);
  const scValue = createShortcutValue(value);
  return `<${SHORTCUT_ELEMENT}>{${scName}${scAttribs}${scValue}}</${SHORTCUT_ELEMENT}>`;
}

function isInsideShortcutElement(
  editor: Editor,
  node?: HTMLElement | Node
): boolean {
  const { dom, selection } = editor;
  const n = node ?? selection.getNode();
  return dom.getParent(n, SHORTCUT_ELEMENT) !== null;
}

function writeToSelection(
  editor: Editor,
  selection: EditorSelection,
  range: Range,
  value: string
): void {
  const bookmark = selection.getBookmark();
  selection.setRng(range);
  selection.setContent(value);
  selection.moveToBookmark(bookmark);
  editor.nodeChanged();
}

// TODO need to figure out event emit
function unwrap(editor: Editor, node: HTMLElement, atStart: boolean): void {
  const { selection } = editor;
  // const parent = dom.getParent(node, SHORTCUT_ELEMENT);
  // selection.select(parent as Node);
  // editor.execCommand('mceReplaceContent', false, parent?.textContent || '');
  // editor.nodeChanged();

  let shortcutElement: HTMLElement | null = node;
  while (shortcutElement) {
    if (shortcutElement.nodeName.toLowerCase() === 'shortcut') {
      break;
    }

    shortcutElement = shortcutElement.parentElement;
  }

  const parent = shortcutElement?.parentElement;
  if (parent && shortcutElement) {
    const text = shortcutElement.textContent || '';
    const newText = atStart
      ? text.substring(1)
      : text.substring(0, text.length);
    if (
      shortcutElement.previousSibling &&
      shortcutElement.previousSibling.nodeType === 3
    ) {
      // Text node append
      const offset = (shortcutElement.previousSibling.textContent || '').length;
      shortcutElement.previousSibling.textContent = `${shortcutElement.previousSibling.textContent}${newText}`;
      if (atStart) {
        selection.setCursorLocation(shortcutElement.previousSibling, offset);
      }
    } else {
      parent.insertBefore(document.createTextNode(newText), shortcutElement);
    }
    parent.removeChild(shortcutElement);
    editor.nodeChanged();
  }
}

function process(editor: Editor) {
  const { dom, selection } = editor;
  // Not inside shortcut element -> attempt to create
  // TODO allow nesting with checking for shortcut-value token
  if (!isInsideShortcutElement(editor)) {
    const node = selection.getNode();
    const text = (node.innerHTML || '').replace(
      /<shortcut>(.*)<\/shortcut>/gims,
      ''
    );
    const rng = selection.getRng();

    const match = text.match(SHORTCUT_REGEX());
    if (match) {
      const [fullMatch, shortcutName, attributes, value] = match;
      const startIndex = text.indexOf(fullMatch);

      const matchingRange = dom.createRng();
      matchingRange.setStart(rng.startContainer, startIndex);
      matchingRange.setEnd(rng.endContainer, fullMatch.length + startIndex);

      writeToSelection(
        editor,
        selection,
        matchingRange,
        createShortcut(shortcutName, attributes, value)
      );
    }
  } else {
    // Inside shortcut element -> See if anything needs moving out
    const shortcutElement = dom.getParent(
      selection.getNode(),
      SHORTCUT_ELEMENT
    ) as HTMLElement;
    const text = shortcutElement.textContent || '';
    const outOfBoundsMatch = text.match(/^(.*)\{(.*)\}(.*)$/ims);
    if (outOfBoundsMatch) {
      let [, startText, , endText] = outOfBoundsMatch;
      startText = (startText || ('' as any))
        .replace(WHITESPACE, ' ')
        .replaceAll(' ', '&nbsp;');
      endText = (endText || ('' as any))
        .replace(WHITESPACE, ' ')
        .replaceAll(' ', '&nbsp;');
      if (shortcutElement && (startText || endText)) {
        const cursorParent = shortcutElement.parentNode;
        shortcutElement.innerHTML = shortcutElement.innerHTML
          .replace(new RegExp(`^${startText}`), '')
          .replace(new RegExp(`${endText}$`), '');
        const bookmark = startText ? null : selection.getBookmark();
        selection.select(shortcutElement);
        selection.setContent(`${startText}${selection.getContent()}${endText}`);

        editor.nodeChanged();
        if (bookmark) {
          selection.moveToBookmark(bookmark);
        } else if (cursorParent) {
          selection.setCursorLocation(
            cursorParent,
            (cursorParent as HTMLElement).innerHTML.indexOf(
              (shortcutElement as HTMLElement).outerHTML
            )
          );
        }
      }
    } else {
      unwrap(editor, shortcutElement, false);
    }
  }
}

tinymce.PluginManager.add('autoshortcut', (editor) => {
  editor.on('BeforeInit', () => {
    tinymce.activeEditor?.schema.addCustomElements('shortcut');
  });

  editor.on('keydown', (e) => {
    // Check if the current node is a shortcut element
    const node = editor.selection.getNode();
    if (
      node.nodeName.toLowerCase() === 'shortcut' ||
      isInsideShortcutElement(editor)
    ) {
      // Check if the enter key was pressed
      if (e.keyCode === 13) {
        // Insert a <br> at the caret instead of creating a new <p> element
        editor.selection.setContent('<br>', { format: 'html' });
        e.preventDefault();
        // TODO figure out how to not inject brs outside of the {}
      }

      const rng = editor.selection.getRng();
      if (e.key === 'Backspace' && rng.startContainer.textContent === '{') {
        e?.preventDefault();
        unwrap(editor, node, true);
      }
    }
  });

  editor.on('keyup', () => {
    try {
      process(editor);
    } catch (err) {
      // console.warn(err);
    }
  });
});
