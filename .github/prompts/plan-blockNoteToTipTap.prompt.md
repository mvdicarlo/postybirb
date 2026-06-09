# Plan: Replace BlockNote with TipTap

**TL;DR** — Replace BlockNote's editor and JSON format with a custom-built TipTap editor across both the UI (`DescriptionEditor`) and server-side parser. TipTap packages are already partially installed. The editor will use individually-composed extensions (not StarterKit) for fine-grained control, with a fixed Mantine toolbar + floating bubble menu. All 6 custom shortcut nodes will be reimplemented as TipTap Node extensions. The server parser (~17 files, including 5 converters) will be rewritten to consume TipTap's native `{ type, attrs, content, marks }` JSON. Existing saved descriptions get a one-time migration from BlockNote JSON → TipTap JSON.

## Steps

### 1. Install missing TipTap packages

Add these as direct dependencies to `package.json` (all at `^3.12.1` to match existing):

- `@tiptap/react` — React bindings (`useEditor`, `EditorContent`, `BubbleMenu`, `FloatingMenu`). Currently only a transitive dep at 3.11.1.
- `@tiptap/extension-bullet-list`, `@tiptap/extension-ordered-list`, `@tiptap/extension-list-item` — list support
- `@tiptap/extension-code` — inline code mark
- `@tiptap/extension-code-block` — fenced code blocks
- `@tiptap/extension-dropcursor`, `@tiptap/extension-gapcursor` — cursor UX
- `@tiptap/extension-history` — undo/redo
- `@tiptap/extension-placeholder` — empty editor placeholder text
- `@tiptap/suggestion` — powers trigger-character menus (`/`, `@`, `` ` ``, `{`)

Already installed and reused: `@tiptap/core`, `@tiptap/pm`, `@tiptap/extension-document`, `@tiptap/extension-paragraph`, `@tiptap/extension-text`, `@tiptap/extension-bold`, `@tiptap/extension-italic`, `@tiptap/extension-strike`, `@tiptap/extension-underline`, `@tiptap/extension-heading`, `@tiptap/extension-blockquote`, `@tiptap/extension-horizontal-rule`, `@tiptap/extension-hard-break`, `@tiptap/extension-link`, `@tiptap/extension-color`, `@tiptap/extension-text-style`, `@tiptap/extension-text-align`, `@tiptap/html`.

### 2. Define TipTap JSON types in shared types lib

Update `libs/types/src/models/submission/description-value.type.ts` to use TipTap's JSON shape instead of BlockNote's `Block[]`:

- Define `TipTapDoc` type: `{ type: 'doc'; content: TipTapNode[] }`
- Define `TipTapNode`: `{ type: string; attrs?: Record<string, any>; content?: TipTapNode[]; marks?: TipTapMark[]; text?: string }`
- Define `TipTapMark`: `{ type: string; attrs?: Record<string, any> }`
- Change `Description` type alias from `Block<...>[]` → `TipTapDoc`
- Update `DefaultDescription()` to return `{ type: 'doc', content: [] }`
- Remove all `@blocknote/core` imports from this file

This type is the single contract between UI and server — updating it here propagates to both.

### 3. Create custom TipTap Node extensions

Create new directory: `apps/postybirb-ui/src/remake/components/shared/description-editor/extensions/`

Each custom node becomes a `Node.create()` with `addAttributes()`, `addNodeView()` (React `NodeViewWrapper`), and `addCommands()`:

**3a. `DefaultShortcutExtension`** — block node (`group: 'block'`, `atom: true`)

- Attrs: `{ only: { default: '' } }`
- NodeView: renders existing `Badge` + `WebsiteOnlySelector` component (reuse `website-only-selector.tsx`)
- Command: `setDefaultShortcut()` inserts the node

**3b. `CustomShortcutExtension`** — inline node (`group: 'inline'`, `inline: true`, `atom: true`)

- Attrs: `{ id: { default: '' }, only: { default: '' } }`
- NodeView: grape Badge showing shortcut name from store + `WebsiteOnlySelector`
- Keep the `useCustomShortcuts()` hook integration

**3c. `UsernameShortcutExtension`** — inline node (`group: 'inline'`, `inline: true`, `atom: true`)

- Attrs: `{ id: { default: '' }, shortcut: { default: '' }, only: { default: '' }, username: { default: '' } }`
- NodeView: most complex — two-part badge with website selector popover + editable username `<input>`. Port the arrow-key navigation and `updateAttributes()` calls from `inline-username-shortcut.tsx`. TipTap's `NodeViewProps` provides `updateAttributes` natively — simpler than BlockNote's `updateInlineContent` approach.

**3d. `TitleShortcutExtension`** — inline node, `atom: true`, attrs: `{ only }`, renders blue Badge
**3e. `TagsShortcutExtension`** — inline node, `atom: true`, attrs: `{ only }`, renders teal Badge
**3f. `ContentWarningShortcutExtension`** — inline node, `atom: true`, attrs: `{ only }`, renders orange Badge

The `WebsiteOnlySelector` component (~308 lines) is framework-agnostic (pure Mantine) — reuse it as-is.

### 4. Build suggestion/slash-menu system

Using `@tiptap/suggestion`, create 4 trigger-character menus that replicate the current behavior:

- **`/` (Slash menu):** Insert block types — paragraph, headings 1-3, divider, blockquote, bullet list, ordered list, default shortcut. Renders as a Mantine dropdown/popover with filtered items.
- **`@` (Username shortcuts):** Lists available websites with `usernameShortcut` config. Inserts `UsernameShortcut` node.
- **`` ` `` (Custom shortcuts):** Lists user-defined custom shortcuts. Inserts `CustomShortcut` node.
- **`{` (System shortcuts):** Lists Title, Tags, Content Warning. Inserts the corresponding system shortcut node.

Create a shared `SuggestionMenu` React component (Mantine-based dropdown) used by all 4 triggers. Port the filtering logic from `filter-suggestion-item.tsx` and menu-item generation from `menu-items.tsx`.

### 5. Build toolbar components

**5a. Fixed toolbar** (top of editor):

- Create `DescriptionToolbar` component using Mantine `ActionIcon` / `Button` groups
- Formatting: Bold, Italic, Underline, Strikethrough, Code
- Block type: Heading dropdown (H1/H2/H3), Blockquote, Bullet list, Ordered list
- Insert: Horizontal rule, Link
- Alignment: Left, Center, Right
- Color: Text color picker
- History: Undo, Redo
- Each button reads `editor.isActive(...)` for active state and calls `editor.chain().focus().toggle*().run()`

**5b. Bubble menu** (floating, on text selection):

- Use TipTap's `BubbleMenu` component
- Show: Bold, Italic, Underline, Strike, Link, Code — compact inline formatting toolbar
- Uses `shouldShow` callback to only appear on text selection (not on custom nodes)

### 6. Build the new DescriptionEditor component

Rewrite `description-editor.tsx`:

- Use `useEditor()` from `@tiptap/react` with all extensions composed:
  - Core: Document, Paragraph, Text, HardBreak
  - Formatting: Bold, Italic, Strike, Underline, Code, Color, TextStyle
  - Blocks: Heading (levels 1-3), Blockquote, HorizontalRule, BulletList, OrderedList, ListItem, CodeBlock
  - Behavior: History, Dropcursor, Gapcursor, Placeholder, TextAlign, Link
  - Custom: DefaultShortcut, CustomShortcut, UsernameShortcut, TitleShortcut, TagsShortcut, ContentWarningShortcut
  - Menus: 4 Suggestion instances for `/`, `@`, `` ` ``, `{`
- Render `<DescriptionToolbar editor={editor} />` + `<EditorContent editor={editor} />` + `<BubbleMenu />`
- Keep the same props interface: `{ value?: Description; onChange; isDefaultEditor?; showCustomShortcuts?; minHeight? }`
- `onChange` fires with `editor.getJSON()` (TipTap's native JSON)
- `value` sets initial content via `editor.commands.setContent(value)` or the `content` option on `useEditor`
- Conditionally register extensions based on props (`isDefaultEditor` hides DefaultShortcut, `showCustomShortcuts` controls CustomShortcut visibility in menus)

### 7. Rewrite server-side description parser

This is the heaviest step. The parser processes `Description` (now TipTap JSON) into HTML/BBCode/Markdown/PlainText/NPF.

**7a. Update types** in `description-node.types.ts`:

- Replace `IDescriptionBlockNode`, `IDescriptionInlineNode`, `IDescriptionTextNode`, `Styles` with TipTap-shaped interfaces:
  - `ITipTapNode { type: string; attrs?: Record<string, any>; content?: ITipTapNode[]; marks?: ITipTapMark[]; text?: string }`
  - `ITipTapMark { type: string; attrs?: Record<string, any> }`
- Remove `BlockType`, `InlineType` enums (TipTap uses string `type` directly)

**7b. Replace or rewrite node wrapper classes:**

- `block-description-node.ts` — Adapt to wrap `ITipTapNode`. Key change: no `props` (use `attrs`), no `children` (nested blocks are in `content`), no `id` field. Text nodes have `marks` array instead of `styles` object.
- `inline-description-node.ts` — Links are now `marks` on text nodes, not container nodes. Custom shortcuts are inline nodes with `attrs`.
- `text-description-node.ts` — `styles` → helper that reads `marks` array. e.g., `isBold()` checks `marks.some(m => m.type === 'bold')`.

**7c. Rewrite all 6 converters** to consume TipTap node structure:

- `base-converter.ts` — Update `convertBlocks/convertChildren` for TipTap's `content` (which mixes blocks and inline nodes), update shortcut detection to read `attrs` instead of `props`
- `html-converter.ts` — `attrs.level` instead of `props.level`, marks-based style wrapping, link marks → `<a>` tags
- `bbcode-converter.ts` — Same structural changes
- `plaintext-converter.ts` — Simpler; mainly `attrs` rename
- `custom-converter.ts` — Update interface types
- `npf-converter.ts` — 581 lines, most complex. Needs careful rewrite for the marks-to-formatting-ranges conversion.

**7d. Update `DescriptionNodeTree`** (`description-node-tree.ts`):

- Input changes from `Block[]` (flat array of top-level blocks) → `TipTapDoc.content` (array of nodes from the doc)
- Inline node finders (`findByType`, `findUsernameShortcuts`, etc.) adapt to TipTap's flat inline model where custom shortcuts are inline nodes in `content`

**7e. Update `DescriptionParserService`** (`description-parser.service.ts`):

- `mergeBlocks()` logic adapts to TipTap structure (merging adjacent paragraphs)
- Entry point receives `TipTapDoc` instead of `Block[]`

**7f. Delete** `description-schema.ts` (812-line frozen BlockNote schema) — no longer needed. TipTap's schema is defined by the extensions, and the server parser works with the JSON directly without needing a schema object.

### 8. Write data migration

Create a migration utility to convert existing saved descriptions from BlockNote JSON → TipTap JSON. This runs once on app startup/upgrade.

Location: `apps/client-server/src/app/legacy-database-importer/` or a new migration directory.

The migration transforms each saved `Description` (array of BlockNote blocks) into a `TipTapDoc`:

- Wrap in `{ type: 'doc', content: [...] }`
- For each block: `{ id, type, props, content, children }` → `{ type, attrs: props (minus defaults), content: [...converted inline...] }`
- For each text node: `{ type: 'text', text, styles: { bold: true, ... } }` → `{ type: 'text', text, marks: [{ type: 'bold' }, ...] }`
- Link inline nodes: `{ type: 'link', href, content: [texts] }` → text nodes get a `{ type: 'link', attrs: { href } }` mark added
- `children` arrays → nested within parent node's `content` (e.g., if a paragraph has children, they become subsequent nodes — or wrapped in a custom nesting structure if needed)
- Custom nodes: `{ type: 'username', props: { id, shortcut, ... } }` → `{ type: 'username', attrs: { id, shortcut, ... } }` (straightforward rename)

Add the migration to the app startup sequence. Detect format by checking if the root is an array (BlockNote) vs an object with `type: 'doc'` (TipTap).

### 9. Update server-side tests

Rewrite test fixtures in `description-node.spec.ts` (1845 lines) and `npf-converter.spec.ts` to use TipTap JSON format for input data. Expected output (HTML/BBCode/etc.) should remain identical — these tests serve as regression guards that the parser produces the same output regardless of the input format change.

### 10. Clean up BlockNote

After migration is verified:

- Remove `@blocknote/core`, `@blocknote/mantine`, `@blocknote/react`, `@blocknote/server-util` from `package.json`
- Delete `blocknote-locales.d.ts`
- Remove BlockNote locale references from `languages.tsx` and `use-locale.ts`
- Delete old BlockNote custom-blocks directory contents (replaced by `extensions/`)
- Delete the legacy editor under `apps/postybirb-ui/src/components/shared/postybirb-editor/` if no longer referenced
- Update `legacy-custom-shortcut.ts` to use `@tiptap/html` instead of `ServerBlockNoteEditor` for HTML→JSON conversion
- Clean up CSS: replace BlockNote-specific class selectors (`.bn-container`, `.bn-editor`) with TipTap's (`.tiptap`, `.ProseMirror`)

## Verification

1. **Unit tests:** Run `nx test client-server` — all ~1845 lines of description parser tests should pass with TipTap JSON input and identical output
2. **Manual UI test:** Create a submission, use the description editor. Verify: bold/italic/underline/strike/code formatting, headings, lists, blockquotes, horizontal rules, links, text alignment, text color, undo/redo
3. **Custom nodes:** Insert each shortcut type via trigger characters (`/`, `@`, `` ` ``, `{`). Verify badge rendering, `WebsiteOnlySelector` popover, username input editing
4. **Migration:** Load an existing submission with BlockNote-format description. Confirm it displays correctly in the new TipTap editor after migration
5. **Output parity:** Compare HTML/BBCode/Markdown output from the new parser against the old parser for a set of representative descriptions
6. **Build:** `nx build postybirb` and `nx build client-server` — no BlockNote imports remain

## Decisions

- **No StarterKit:** Extensions composed individually for control over exactly what's included
- **TipTap JSON native:** No adapter layer — server parser is rewritten to consume TipTap JSON directly
- **One-time migration:** Existing data converted on startup; no dual-format support
- **FileAltTextEditor deferred:** Not in this phase
- **`@tiptap/suggestion`:** Used for all trigger-character menus rather than building raw ProseMirror input rules

## Reference: Files Affected

### UI Files (create/rewrite)

| File | Action |
|------|--------|
| `description-editor/description-editor.tsx` | Rewrite |
| `description-editor/description-editor.css` | Update selectors |
| `description-editor/types.ts` | Rewrite (remove BlockNote types) |
| `description-editor/filter-suggestion-item.tsx` | Port to suggestion menu component |
| `description-editor/extensions/default-shortcut.tsx` | Create |
| `description-editor/extensions/custom-shortcut.tsx` | Create |
| `description-editor/extensions/username-shortcut.tsx` | Create |
| `description-editor/extensions/title-shortcut.tsx` | Create |
| `description-editor/extensions/tags-shortcut.tsx` | Create |
| `description-editor/extensions/content-warning-shortcut.tsx` | Create |
| `description-editor/extensions/index.ts` | Create (barrel) |
| `description-editor/components/description-toolbar.tsx` | Create |
| `description-editor/components/bubble-toolbar.tsx` | Create |
| `description-editor/components/suggestion-menu.tsx` | Create |
| `description-editor/custom-blocks/website-only-selector.tsx` | Keep as-is |
| `description-editor/custom-blocks/*.tsx` (BlockNote versions) | Delete |
| `description-editor/custom-blocks/menu-items.tsx` | Port logic to suggestion configs |
| `blocknote-locales.d.ts` | Delete |
| `remake/i18n/languages.tsx` | Remove BlockNote locale |
| `remake/hooks/use-locale.ts` | Remove BlockNote locale |

### Shared Types (update)

| File | Action |
|------|--------|
| `libs/types/src/models/submission/description-value.type.ts` | Rewrite |

### Server Files (rewrite)

| File | Action |
|------|--------|
| `post-parsers/models/description-node/description-node.types.ts` | Rewrite |
| `post-parsers/models/description-node/description-node.base.ts` | Update |
| `post-parsers/models/description-node/block-description-node.ts` | Rewrite |
| `post-parsers/models/description-node/inline-description-node.ts` | Rewrite |
| `post-parsers/models/description-node/text-description-node.ts` | Rewrite |
| `post-parsers/models/description-node/description-node-tree.ts` | Rewrite |
| `post-parsers/models/description-node/converters/base-converter.ts` | Rewrite |
| `post-parsers/models/description-node/converters/html-converter.ts` | Rewrite |
| `post-parsers/models/description-node/converters/bbcode-converter.ts` | Rewrite |
| `post-parsers/models/description-node/converters/plaintext-converter.ts` | Rewrite |
| `post-parsers/models/description-node/converters/custom-converter.ts` | Rewrite |
| `post-parsers/models/description-node/converters/npf-converter.ts` | Rewrite |
| `post-parsers/schemas/description-schema.ts` | Delete |
| `post-parsers/parsers/description-parser.service.ts` | Update |
| `post-parsers/models/description-node.spec.ts` | Rewrite fixtures |
| `post-parsers/models/description-node/converters/npf-converter.spec.ts` | Rewrite fixtures |
| `post-parsers/parsers/description-parser.service.spec.ts` | Update |
| `legacy-database-importer/legacy-entities/legacy-custom-shortcut.ts` | Update |

### Dependencies (package.json)

| Package | Action |
|---------|--------|
| `@tiptap/react` | Add `^3.12.1` |
| `@tiptap/extension-bullet-list` | Add `^3.12.1` |
| `@tiptap/extension-ordered-list` | Add `^3.12.1` |
| `@tiptap/extension-list-item` | Add `^3.12.1` |
| `@tiptap/extension-code` | Add `^3.12.1` |
| `@tiptap/extension-code-block` | Add `^3.12.1` |
| `@tiptap/extension-dropcursor` | Add `^3.12.1` |
| `@tiptap/extension-gapcursor` | Add `^3.12.1` |
| `@tiptap/extension-history` | Add `^3.12.1` |
| `@tiptap/extension-placeholder` | Add `^3.12.1` |
| `@tiptap/suggestion` | Add `^3.12.1` |
| `@blocknote/core` | Remove |
| `@blocknote/mantine` | Remove |
| `@blocknote/react` | Remove |
| `@blocknote/server-util` | Remove |
