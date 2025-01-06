# Description Parsing

> [!WARNING]
> This section is volatile at the moment until it has been more properly battle-tested
> during actual website implementation, so please bear with me on any gaps that may exist.

Some websites may need to customize their description outputs to be more than the
out-of-the-box implementations of Markdown, HTML, or Plaintext.

Currently, description data is collected from BlockNote (object format) and custom
parsers build the official description.

## Sample

```ts
@SupportsDescription(DescriptionType.HTML)
export default class Foo extends Website<FooAccountData> {
  // ...
}
```

## Custom Parsing Sample

It should be very infrequent, but there is the option to support entirely new description
types not provided in the `DescriptionType` choices.

To do this you can add the `WithCustomDescriptionParser` interface and `@SupportsDescription`
decorator.

Unfortunately, this has not really been battle-tested yet and I honestly don't remember
how I intended the onDescriptionParse playing out so please bear with me until I have
a chance to implement BBCode through this tooling.

```ts
@SupportsDescription(DescriptionType.CUSTOM)
export default class Foo extends Website<FooAccountData> implements WithCustomDescriptionParser {
  onDescriptionParse(node: DescriptionNode) {
    return node.toHtmlString();
  }

  onAfterDescriptionParse(description: string): string {
    return description.replace('<div>', '<p>').replace('</div>', '</p>');
  }
}
```
