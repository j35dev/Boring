# Philosophy

> **The boring parts of building software, already figured out.**

Boring is a community-maintained knowledge base for the ordinary parts of software
that developers repeatedly forget, implement incorrectly, or rediscover from scratch:
password resets, sessions, webhooks, file uploads, text handling.

The premise is simple. Every competent developer *knows* a reset token should not
work twice. Yet reset tokens get reused in production every week, because the
developer who wrote the feature was thinking about the happy path, and nobody —
human or AI — handed them the checklist of everything that feature must survive.

Boring's answer is a structured, source-backed record of that checklist, maintained
by the people who hit the bugs.

## Three layers

```text
SPEC
  ↓
EDGE CASES
  ↓
VERIFICATION
```

**Specs** describe what a correct implementation of a common feature must do.
A spec answers: *what behavior is required?* It does not tell you which framework,
language, or database to use. Specs define behavior, not architecture.

**Edge cases** describe the inputs, states, sequences, timing situations, and
environmental conditions that break implementations — much more than weird strings.
A duplicate webhook delivery is an edge case. So is a DST transition. So is two
simultaneous requests completing the same password reset.

**Verification** describes how to determine whether an implementation satisfies the
spec: acceptance criteria, test scenarios, expected outcomes — structured enough that
future tooling can consume them. Boring does not ship a test framework yet; see
[test-strategy.md](test-strategy.md).

## The five rules behind the content

### 1. Primary sources beat opinions

No rule exists in Boring because it "sounds right". Every rule carries provenance:
standards and specifications (IETF, WHATWG, W3C, Unicode), authoritative application
guidance (OWASP, NIST), official vendor documentation, established open-source corpora,
and documented field experience. Generic blog advice is not evidence. See
[sources.md](sources.md) for the source quality model.

### 2. Research and normalize; don't copy documentation

Boring contains original, concise explanations derived from source material. We do not
mirror third-party documentation. Every important requirement keeps its provenance so
we can always answer: *why is this rule here?*

### 3. Separate fact from opinion

A requirement does not become `MUST` because it sounds reasonable.

- **MUST** — an implementation would normally be incorrect, unsafe, or seriously
  incomplete without it.
- **SHOULD** — strong default guidance; legitimate applications may reasonably not
  follow it.
- **CONSIDER** — context-dependent behavior worth deliberately deciding.

### 4. Scope everything

Not every recommendation applies to every application. Rules state when they apply
(`applies_when`) and when they don't (`does_not_apply_when`). Cookie-specific
requirements are scoped to cookie-based sessions. Vendor-specific behavior is labeled
vendor-specific and never promoted to universal rules.

Some questions have no universal answer. Should a 500-character name be rejected?
There is no correct answer for all applications. For those, Boring marks the rule
`decision_required`: the requirement is to *define and consistently enforce a policy*,
not to adopt ours. Boring helps developers notice the problem; it does not pretend
every product must make the same product decision.

### 5. Stable rule IDs

Rules and edge cases carry stable IDs (`BORING-AUTH-RESET-004`,
`BORING-EDGE-WEBHOOK-001`) that people and tools can reference in reviews, audits,
bug reports, and test output. Once published, an ID is never reused for a different
meaning.

## What Boring is not

- Not a framework, library, CLI, SaaS, or web application.
- Not an "awesome list" of links.
- Not a vulnerability scanner or an offensive-security corpus.
- Not an AI product. AI agents are first-class *consumers* of Boring — agents can read
  the specs and audit code against them — but the repository must remain vendor-neutral
  and fully useful without any AI involvement.

## North star

> Developers should not have to personally rediscover every boring software lesson.

Someone hits a duplicate-webhook bug and contributes the scenario. Someone in another
country hits a Unicode bug and contributes it. Someone finds a password-reset race
condition and contributes it. Over time, Boring becomes the collective memory of boring
software bugs humanity has already encountered once — and AI agents can consume that
collective memory before generating the next implementation.

## The long-term asset

The durable value is the structured graph between:

```text
feature → requirement → failure mode → edge case → acceptance scenario → source
```

That graph can later power agents, test generation, code review tooling, websites, IDEs,
CI checks, and educational material. The repository is the first interface to that graph,
which is why the structured data (`spec.yaml`, edge-case YAML) is kept in sync with the
human-readable Markdown from day one.
