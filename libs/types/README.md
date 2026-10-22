# types

Shared API contracts, validation schemas, and application models.

## Request validation

REST request DTOs and their Zod schemas live together under `src/dtos`. Import
the same DTO from `@postybirb/types` in Nest controllers, services, and UI API
clients; there is no separate server DTO or `I`-prefixed request interface.

```ts
import { CreateCustomShortcutDto, CreateCustomShortcutSchema } from '@postybirb/types';

const request: CreateCustomShortcutDto = { name: 'My shortcut' };
const validated = CreateCustomShortcutSchema.parse(request);
// CreateCustomShortcutDto.create(request) also parses and validates.
```

New request contracts should export a schema and a class extending
`createZodDto(schema)` from the local `dtos/zod-dto` helper. This framework-free
helper only imports Zod and exposes the schema and a `.create()` parser on the
DTO class. Neither shared contracts nor the UI depend on Nest or `nestjs-zod`.
DTO properties are inferred from the schema; do not redeclare them or add
class-validator decorators. Use normal value imports for DTO parameters in
decorated Nest controllers so Nest can discover the schema on the DTO class.

The server applies its own `ZodValidationPipe` globally. The pipe discovers the
schema on the request DTO and uses Zod directly. Swagger components are generated
server-side using Zod's native `toJSONSchema` OpenAPI 3.0 target.
Response DTOs and domain model interfaces are not request validators.
`class-transformer` remains in use for the server's response serializer.

### Validation behavior

- Invalid requests return HTTP 400 with `message: "Validation failed"` and an
  `errors` array of Zod issues, including field paths.
- Known nested fields, record values, array elements, enums, and UUID dependencies
  are validated, rather than only checking their outer container.
- Multipart submission creation accepts JSON strings or already-parsed objects
  for dependencies, default options, and file metadata. Omitted and empty string
  JSON fields are optional; malformed JSON is an error.
- Multipart boolean fields accept booleans or the strings `"true"` and `"false"`.
  Other values are errors, not coerced to `false`.
- Template creation requires a non-blank name. Notification defaults and nullable
  account/directory-watcher template selections are preserved.
- Website form schemas retain unknown website-specific fields, and TipTap schemas
  retain custom nodes and attributes. Ordinary request objects strip unknown
  top-level properties.
- Schema parsing applies defaults. `new SomeDto()` alone is not validation;
  use `.create()` or `.parse()` to validate. Notification and website-option
  constructors preserve their legacy initializer defaults for internal callers,
  reading those defaults from their schemas.

## Running tests

Run `nx test types` for shared schema and browser-safe import tests.
Nest HTTP/multipart/OpenAPI integration tests live in
`apps/client-server/src/app/common/validation/zod-validation.spec.ts`.

## Running lint

Run `nx lint types` to execute the lint via [ESLint](https://eslint.org/).
