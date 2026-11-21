# Architecture Decisions

## Shared engine, multiple adapters
Inspection logic belongs in reusable packages. The standalone workbench is the primary product interface. CLI and MCP are adapters that invoke shared capabilities, not separate analysis engines.

## Evidence is a first-class output
Findings carry a classification, source reference, timestamp, coverage description, limitations and relationships where available. Observed, derived, inferred and unknown are not interchangeable. Partial coverage is never proof of absence.

## Explicit effect declarations
Inspectors declare effects. Read-only parsing needs no active-operation approval. Network access, process launches, filesystem writes, foreign-code execution, target mutation and potentially destructive actions require explicit approval at the execution boundary.

## Local-first handling
Private source trees, local binaries and browser data must not be silently uploaded to hosted services. Local adapters remain available if optional remote integrations are added.

## Dependencies
Prefer Node.js built-ins for the initial foundation. Optional heavyweight engines must be separately installed and configured.

## AI-first integration and hosted inspection
The primary integration is MCP. VRuntime Inspector supplies deterministic inspection tools, structured evidence and reconstruction context; the connected AI client supplies reasoning and code generation using the user's existing model, plan and credits. The Inspector does not require an LLM API key or operate its own credit system.

## Hosted website inspection boundaries
Public URL inspection is read-only and bounded by page count, response size, timeout, same-origin rules, redirect validation and robots.txt checks. The hosted beta must state what it cannot observe: JavaScript-driven states, private backend logic, authenticated pages and unobserved interactions. The current in-memory throttle is best-effort only; durable abuse controls are a prerequisite for a high-traffic public launch.

## Runtime browser provider boundary
Runtime browser inspection is a provider-backed capability. Shared policy and evidence normalization live in `packages/inspector-browser`; browser launch, isolation and protocol handling live in separate hosted/local provider adapters. A provider must disclose its limits and cost before use. The hosted provider is opt-in and must not silently incur paid usage. Local browser sessions and private artifacts remain on the user's machine.

## Runtime interaction safety
Every click, hover, keypress, scroll or navigation action in a runtime investigation is explicitly approved and bounded. Destructive or externally committing actions (including form submission, payment, deletion, publishing, uploading, installation and logout) are blocked from automatic exploration. Browser network access must be restricted at the provider boundary, including redirect and DNS/IP validation.
