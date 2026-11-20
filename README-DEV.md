# Development

## Requirements
- Node.js 22 or newer
- npm 10 or newer

## Run checks
This initial workspace uses Node.js built-ins and has no third-party runtime dependencies.

    npm test
    npm run check

## Run the CLI

    node apps/cli/src/index.js help
    node apps/cli/src/index.js inspect-har ./capture.har
    node apps/cli/src/index.js analyze-js ./src/main.js

## Run the standalone workbench

    npm run web

Open http://127.0.0.1:4173. The first vertical slice imports HAR files up to 10 MiB and displays sanitized request metadata. The server binds to loopback by default.

See docs/IMPLEMENTATION_STATUS.md before relying on a capability.
