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
