# HTML to NPF Quick Reference

## TL;DR

Convert PostyBirb descriptions to Tumblr NPF format:

```typescript
import { convertToNpf } from './html-to-npf';

const npfBlocks = convertToNpf(descriptionNode);
// Send to Tumblr API as JSON
```

## Common Conversions

| PostyBirb   | NPF                                                            |
| ----------- | -------------------------------------------------------------- |
| Paragraph   | `{ type: 'text', text: '...' }`                                |
| Bold text   | `formatting: [{ type: 'bold', start: 0, end: 5 }]`             |
| Italic text | `formatting: [{ type: 'italic', start: 0, end: 5 }]`           |
| Link        | `formatting: [{ type: 'link', url: '...', start: 0, end: 5 }]` |
| H1          | `{ type: 'text', text: '...', subtype: 'heading1' }`           |
| H2          | `{ type: 'text', text: '...', subtype: 'heading2' }`           |
| Image       | `{ type: 'image', media: [...] }`                              |
| Video       | `{ type: 'video', media: {...} }`                              |

## NPF Block Examples

### Simple Text

```json
{
  "type": "text",
  "text": "Hello, World!"
}
```

### Bold Text

```json
{
  "type": "text",
  "text": "Hello, World!",
  "formatting": [
    {
      "start": 0,
      "end": 5,
      "type": "bold"
    }
  ]
}
```

### Heading

```json
{
  "type": "text",
  "text": "Main Title",
  "subtype": "heading1"
}
```

### Link

```json
{
  "type": "text",
  "text": "Visit PostyBirb",
  "formatting": [
    {
      "start": 6,
      "end": 15,
      "type": "link",
      "url": "https://postybirb.com"
    }
  ]
}
```

### Image

```json
{
  "type": "image",
  "media": [
    {
      "url": "https://example.com/image.jpg",
      "type": "image/jpeg",
      "width": 800,
      "height": 600
    }
  ],
  "alt_text": "Description"
}
```

## API Integration

```typescript
// 1. Convert description to NPF
const npfContent = convertToNpf(node);

// 2. Prepare post payload
const payload = {
  content: npfContent,
  tags: 'tag1,tag2',
  state: 'published',
};

// 3. Submit to Tumblr
await Http.post(`/v2/blog/${blog}/posts`, {
  data: payload,
  type: 'json',
});
```

## Formatting Types

| Type            | Fields                | Example                                               |
| --------------- | --------------------- | ----------------------------------------------------- |
| `bold`          | `start`, `end`        | `{ start: 0, end: 5, type: 'bold' }`                  |
| `italic`        | `start`, `end`        | `{ start: 0, end: 5, type: 'italic' }`                |
| `strikethrough` | `start`, `end`        | `{ start: 0, end: 5, type: 'strikethrough' }`         |
| `link`          | `start`, `end`, `url` | `{ start: 0, end: 5, type: 'link', url: '...' }`      |
| `color`         | `start`, `end`, `hex` | `{ start: 0, end: 5, type: 'color', hex: '#ff0000' }` |

## Text Subtypes

- `heading1` - Main heading
- `heading2` - Subheading
- `quote` - Block quote
- `indented` - Indented text
- `chat` - Chat/dialogue format
- `ordered-list-item` - Numbered list
- `unordered-list-item` - Bullet list

## Media Types

### Image

```json
{
  "type": "image",
  "media": [{ "url": "...", "type": "image/jpeg" }],
  "alt_text": "...",
  "caption": "..."
}
```

### Video

```json
{
  "type": "video",
  "provider": "tumblr",
  "url": "...",
  "media": { "url": "...", "type": "video/mp4" }
}
```

### Audio

```json
{
  "type": "audio",
  "provider": "tumblr",
  "url": "...",
  "media": { "url": "...", "type": "audio/mp3" }
}
```

## Common Patterns

### Multiple Formatting

```json
{
  "type": "text",
  "text": "Bold and italic",
  "formatting": [
    { "start": 0, "end": 15, "type": "bold" },
    { "start": 0, "end": 15, "type": "italic" }
  ]
}
```

### Mixed Content

```json
[
  {
    "type": "text",
    "text": "Check out this image:",
    "subtype": "heading2"
  },
  {
    "type": "image",
    "media": [{ "url": "..." }]
  },
  {
    "type": "text",
    "text": "Pretty cool, right?"
  }
]
```

### Link in Text

```json
{
  "type": "text",
  "text": "Visit PostyBirb for more info",
  "formatting": [
    {
      "start": 6,
      "end": 15,
      "type": "link",
      "url": "https://postybirb.com"
    }
  ]
}
```

## Gotchas

⚠️ **Formatting ranges are zero-indexed and exclusive at the end**

```json
// Text: "Hello"
// Range: start=0, end=5 (not 4!)
```

⚠️ **Multiple formatting on same range is allowed**

```json
// Can have bold AND italic on same text
```

⚠️ **Headings are text blocks with subtypes**

```json
// Not a separate block type!
{ "type": "text", "subtype": "heading1" }
```

⚠️ **Media URLs must be absolute**

```json
// Good: "https://example.com/image.jpg"
// Bad: "/images/image.jpg"
```

## Debugging

### Check NPF Structure

```typescript
const npf = convertToNpf(node);
console.log(JSON.stringify(npf, null, 2));
```

### Validate Formatting

```typescript
npf.forEach((block) => {
  if (block.type === 'text' && block.formatting) {
    block.formatting.forEach((fmt) => {
      if (fmt.start >= fmt.end) {
        console.error('Invalid range:', fmt);
      }
      if (fmt.end > block.text.length) {
        console.error('Range exceeds text length:', fmt);
      }
    });
  }
});
```

## Resources

- 📘 [Full Documentation](./README.md)
- 🔧 [Integration Guide](./INTEGRATION.md)
- 📊 [Summary](./SUMMARY.md)
- 🌐 [Tumblr NPF Spec](https://www.tumblr.com/docs/npf)
