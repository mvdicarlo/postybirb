# platform

Abstract service definitions that decouple the application from runtime-specific
APIs (Electron, Node-only modules, OS integrations). Concrete implementations
for each runtime live elsewhere (e.g. `apps/client-server/src/app/platform/`
provides Electron-backed implementations).

This library has **no runtime dependencies on Electron**. Importing from
`@postybirb/platform` is safe in any context — server tests, libs, headless
runners, future Docker-only modes.

## Pattern

Each platform capability is exposed as an `abstract class`. Abstract classes
serve as both the TypeScript type and the NestJS DI token:

```ts
@Injectable()
class MyService {
  constructor(private readonly app: PlatformAppService) {}
}
```

A runtime registers concrete implementations with NestJS:

```ts
{ provide: PlatformAppService, useClass: ElectronAppService }
```

For tests, swap in mocks/stubs using the same token.
