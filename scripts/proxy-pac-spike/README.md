# Proxy PAC spike (Electron 41)

Manual spike for Phase 0 (`spike-pac-system`). Results are recorded in [`.ai-factory/RESEARCH.md`](../../.ai-factory/RESEARCH.md).

## Quick run (PAC resolve only)

From repo root:

```bash
npx electron scripts/proxy-pac-spike/spike.mjs
```

Expected stdout:

- `resolveProxy` for `proxy-target.test` → contains `PROXY` or `SOCKS`
- `resolveProxy` for `direct-target.test` → `DIRECT`
- `resolveProxy` for `127.0.0.1` → `DIRECT`

## Optional live proxy auth test

Requires a reachable HTTP or SOCKS5 proxy with known credentials:

```powershell
$env:SPIKE_PROXY_TYPE = "http"   # or socks5
$env:SPIKE_PROXY_HOST = "127.0.0.1"
$env:SPIKE_PROXY_PORT = "8080"
$env:SPIKE_PROXY_USER = "user"
$env:SPIKE_PROXY_PASS = "pass"
$env:SPIKE_TEST_URL = "https://example.com"
npx electron scripts/proxy-pac-spike/spike.mjs --live
```

Logs `[SpikePac] login` when Chromium requests proxy credentials.

## What this does not test

- Nest PAC HTTP route (Phase 2)
- Partition cookie isolation
- Teleproto SOCKS (Telegram task)
