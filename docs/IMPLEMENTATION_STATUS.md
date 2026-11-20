# Implementation Status

## Working in 0.1.0

- Shared npm workspace and structured inspector errors.
- Evidence records with classification validation, SHA-256 content digest, and an in-memory ledger.
- Inspector registry with job states, cancellation signal propagation, timeout handling, and explicit approval checks for declared active effects.
- JavaScript source-text scanner for common literal imports, re-exports, dynamic imports, CommonJS requires, and source-map reference hints. This is regex-based, not AST parsing.
- HAR import, request inventory, credential-like header/query redaction, observed evidence records, and sanitized method/URL comparison.
- Local CLI commands for HAR and JavaScript source files.
- Local standalone workbench for HAR import and request/evidence summary. Server binds to loopback by default and limits JSON uploads to 10 MiB.

## Not shipped yet

- Full ECMAScript/TypeScript AST parsing, package resolution, source-map reconstruction, or call-graph analysis.
- Live browser/CDP inspection, DOM/accessibility capture, or framework fingerprinting.
- Electron ASAR/IPC/fuse inspection.
- Native ELF/PE/Mach-O parsing or Ghidra integration.
- Runtime process instrumentation or sandbox execution.
- MCP server, remote HTTP deployment, authentication, Docker packaging, persistence, accounts, or collaboration.
- Interactive 3D graph rendering in the standalone workbench.

## Verification

Run npm run check and npm test with Node.js 22 or newer. CI runs these checks on pushes to main, pull requests, and manual dispatches. Do not describe a check as passing unless its run has completed successfully.
