# Blockers & Issues

## pnpm install failure
- **Command**: `pnpm install`
- **Error**: Failed to download `pnpm-9.0.0.tgz` from npm registry due to HTTP tunneling proxy response 403 (RequestAbortedError).
- **Log**:
  ```
  Error: Error when performing the request to https://registry.npmjs.org/pnpm/-/pnpm-9.0.0.tgz
  ...
  RequestAbortedError [AbortError]: Proxy response (403) !== 200 when HTTP Tunneling
  ```
- **Impact**: Unable to install dependencies, so linting/testing commands could not be executed within this environment.
