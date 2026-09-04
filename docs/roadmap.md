# Roadmap

Direction, not promises. Scope is added only when it can meet the quality bar in
[methodology.md](methodology.md).

## v0.1 — the research repository (this release)

- Philosophy, methodology, taxonomy, and source model
- JSON schemas for specs, edge cases, and the source registry
- Six polished specs: password reset, sessions, webhooks, file uploads,
  input/text validation, pagination
- Cross-cutting edge-case datasets: Unicode/text, email, date & time, files,
  numeric boundaries, webhook delivery, authentication state, pagination traversal
- A source registry with provenance for every claim
- Evidence blocks, a full normative audit, and a documented review ledger
- Repository validation (schemas, IDs, references, evidence, and Markdown examples) in CI
- A deterministic generated JSON snapshot for agents and downstream tooling
- Contribution and review workflows designed for future community growth
- A documented — not implemented — test strategy ([test-strategy.md](test-strategy.md))

## v0.2 — more domains

Candidate domains, researched to the same standard, roughly in this order:

- account lifecycle (deletion, deactivation, recovery)
- invitations and team membership
- authorization basics
- API keys
- rate limiting
- background jobs
- notifications
- money (researched properly: minor units, rounding, refunds, tax — see below)

Money is deliberately *not* rushed into v0.1: it is deceptively complicated, and a
shallow money section would undercut the project's credibility. It deserves full
treatment using Unicode CLDR and authoritative payment-provider documentation.

## v0.3 — machine consumption at scale

- Published, versioned schemas
- Search/index over the knowledge graph
- Stable release and compatibility policy for the generated dataset
- Agent skill files / integration snippets for common coding agents

## Later — Boring Tests

Executable verification, only when a useful execution model emerges. See
[test-strategy.md](test-strategy.md) for the candidate architectures and open
questions. Potential surface (`boring audit`, `boring verify`) will be built only if
the underlying model earns it — never because developer projects traditionally ship
CLIs.

## Standing principles

- Quality gates quantity: fewer, excellent, sourced entries beat many shallow ones.
- IDs are forever: published IDs are never reused for a different meaning.
- Neutrality: no framework, language, or vendor becomes load-bearing.
- The repository is the first interface to the knowledge graph; every later interface
  builds on the same data.
