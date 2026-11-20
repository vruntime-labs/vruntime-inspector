# Architecture Decisions

## Shared engine, multiple adapters
Inspection logic belongs in reusable packages. The standalone workbench is the primary product interface. CLI and MCP are adapters that invoke shared capabilities, not separate analysis engines.

## Evidence is a first-class output
Findings carry a classification, source reference, timestamp, coverage description, limitations, and relationships where available. Observed, derived, inferred, and unknown are not interchangeable. Partial coverage is never proof of absence.

## Explicit effect declarations
Inspectors declare effects. Read-only parsing needs no active-operation approval. Network access, process launches, filesystem writes, foreign-code execution, target mutation, and potentially destructive actions require explicit approval at the execution boundary.

## Local-first handling
Private source trees, local binaries, and browser data must not be silently uploaded to hosted services. Local adapters remain available if optional remote integrations are added.

## Dependencies
Prefer Node.js built-ins for the initial foundation. Optional heavyweight engines must be separately installed and configured.

## AI-first integration and hosted inspection
The primary integration is MCP. VRuntime Inspector supplies deterministic inspection tools, structured evidence, and reconstruction context; the connected AI client supplies reasoning and code generation using the user's existing model, plan, and credits. The Inspector does not require an LLM API key or operate its own credit system.

A hosted Cloudflare Worker provides a browser-based URL inspection path for users who cannot run a local server. Its initial scope is bounded passive HTML inspection only. Private local artifacts remain on local workflows and are not silently uploaded to the hosted service.

## Hosted website inspection boundaries
Public URL inspection is read-only and bounded by page count, response size, timeout, same-origin rules, redirect validation, and robots.txt checks. The hosted beta must state what it cannot observe: JavaScript-driven states, private backend logic, databases, authenticated pages, and unobserved interactions. The current in-memory throttle is best-effort only; durable abuse controls are a prerequisite for a high-traffic public launch.
