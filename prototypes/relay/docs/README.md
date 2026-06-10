# Relay framework — documentation

Design and implementation knowledge for the proposed "Relay" posting framework.
These are the durable, source-controlled record (do not rely on session memory).

| Doc | What it covers |
|---|---|
| [`01-design.md`](./01-design.md) | Rationale, architecture (job tree + staged pipeline + unified trace), data model, and the refinements made during prototyping (§13). |
| [`02-implementation-plan.md`](./02-implementation-plan.md) | Concrete plan to land it in the real NestJS + Drizzle + Electron app: DB schemas, entities/repos, engine port, UI wiring, migrations, test strategy, and a 6-PR rollout sequence. |

The runnable prototype these describe lives one level up in
[`prototypes/relay/`](../). Start there with the top-level `README.md`, then run:

```bash
node --experimental-strip-types prototypes/relay/demo.ts      # showcase
node --experimental-strip-types prototypes/relay/verify.ts    # 46 assertions
```
