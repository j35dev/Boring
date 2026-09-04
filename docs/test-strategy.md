# Test Strategy

How Boring could eventually move from knowledge to executable verification — and why
nothing executable ships in v0.1.

Boring's data is already shaped for verification: every rule carries
`given / when / expect` acceptance scenarios, stable IDs, and typed edge cases. This
document explores candidate architectures for *Boring Tests*, records their trade-offs,
and states the open questions that would drive a decision. **No architecture is chosen
here, and no framework is implemented.** The runtime design will be its own research
effort, informed by how people actually use the repository.

## What the v0.1 data provides

- **Stable IDs** — test output can cite `BORING-AUTH-RESET-003` the way linters cite
  rule codes.
- **Levels** — `MUST` violations are failures; `SHOULD` are warnings; `CONSIDER`
  surface as "decide deliberately".
- **Applicability** — `applies_when` / `does_not_apply_when` let tooling skip
  requirements that cannot apply, instead of reporting false failures.
- **GIVEN/WHEN/EXPECT scenarios** — declarative, human-readable, agent-readable, and
  structured enough to translate into executable checks.
- **decision_required rules** — verification means "a documented, enforced policy
  exists", which is a different (and simpler) check than verifying a specific choice.

## Model A — Agent-assisted audit

A developer tells their coding agent (Claude, Codex, Cursor, ...): *"Read the Boring
password-reset spec. Inspect my implementation. Report which Boring requirements
appear satisfied, failed, or unverifiable, by rule ID."*

| Pros | Cons |
|---|---|
| Works today, zero infrastructure | Non-deterministic; runs may disagree |
| Stack- and language-independent | The agent may misunderstand the code |
| Reads applicability naturally | Not execution — claims are unverified |
| Improves automatically with better models | Findings need human confirmation |

This model is explicitly supported by v0.1: the README ships copyable prompts, and the
Markdown is written to be agent-consumable. It is the audit path, not "Boring Tests".

## Model B — Black-box contract tests

Boring defines behavior scenarios; the project under test provides a mapping from
Boring's operation names to real endpoints (or functions), e.g.
`request_password_reset → POST /api/reset`. Boring then drives the system externally
and asserts observable behavior.

| Pros | Cons |
|---|---|
| Language- and framework-independent | Requires setup/state adapters (create user, read email, reset clock) |
| Tests actual behavior, not vibes | Authentication, email, and time are hard to fake |
| CI-friendly; deterministic-ish | Not all requirements are externally observable (e.g., token hashing) |
| Vendor-neutral by construction | Adapter effort is the whole cost — per project |

The practical blocker is state: reset-token scenarios need access to emails or token
storage; timeout scenarios need clock control. A viable version likely scopes itself to
externally observable behavior and says so honestly.

## Model C — Framework/language adapters

Deep integrations (`@boring-tests/next`, `@boring-tests/django`, `@boring-tests/rails`)
that understand each framework's session, fixture, and test conventions.

| Pros | Cons |
|---|---|
| Best automation depth | Maintenance explosion across framework versions |
| Can reach internal state | Framework-specific — undermines neutrality |
| Great DX where they exist | Community effort fragments across ecosystems |

Boring's credibility rests on neutrality and stability; dozens of adapters versioned
against fast-moving frameworks would burn both. This model is deprioritized.

## Model D — Generate tests from Boring scenarios

Boring stores declarative scenarios; tooling (AI or adapters) translates them into the
project's native tests — Playwright, Vitest, Pytest, RSpec, JUnit — which then live in
the project's own CI.

| Pros | Cons |
|---|---|
| Output is ordinary code the team owns | Generated tests drift from the source spec |
| Works with any stack that has a test runner | Translation quality varies; needs review |
| No Boring runtime in the target project | One-time generation loses re-runnable Boring semantics |
| Turns the knowledge graph into artifacts | Regeneration vs. hand-edits is unresolved |

This is arguably the most interesting direction: it converts Boring's acceptance
scenarios into durable engineering artifacts with minimal runtime assumptions, and a
"regenerate but preserve local edits" story is tractable. It inherits Model A's
non-determinism at generation time but produces deterministic tests.

## Comparison

| | A: Agent audit | B: Contract tests | C: Adapters | D: Generate |
|---|---|---|---|---|
| Works today | yes | no | no | partially |
| Deterministic | no | yes | yes | after generation |
| True execution | no | yes | yes | yes |
| Vendor-neutral | yes | yes | no | yes |
| Per-project setup | none | high | high | medium |
| Maintenance surface | none | Boring-side | huge | Boring-side |

## Open questions that would drive the decision

1. **Demand signal** — do people audit with agents (A) and want more rigor, or do they
   ask for runnable tests directly?
2. **Scenario observability audit** — for the v0.1 rule set, how many acceptance
   scenarios are externally observable at all? That ratio largely decides B's ceiling.
3. **State adapters** — is there a minimal, honest contract for "give me email boxes,
   a clock, and users" that projects will actually implement?
4. **Generation workflow** — for D, what does re-generation look like after the project
   has edited generated tests? (Marker comments? Mapping manifests? Regenerate-on-fail?)
5. **CLI appetite** — `boring audit` / `boring verify` should exist only if an
   execution model earns it, not because developer tools traditionally ship CLIs.

## Decision

None yet, deliberately. v0.1 ships knowledge plus scenario-shaped data and keeps every
option open. The earliest pragmatic step, if pursued, is likely D (scenario → project-
native test generation) layered on top of A (the audit flow that already works), with B
as the destination if the observability audit proves there is enough externally
checkable behavior to make adapters worth their cost.
