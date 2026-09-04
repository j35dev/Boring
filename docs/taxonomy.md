# Taxonomy

How Boring organizes requirements, edge cases, identifiers, and risk.

## Content model

```text
spec (specs/**)
  └── rule (one testable, reviewable requirement)
        ├── id, title, level (MUST / SHOULD / CONSIDER)
        ├── why, applies_when, exceptions, failure_modes
        ├── sources → sources/registry.yaml
        ├── edge_cases → edge-cases/** (by ID)
        └── verification: given / when / expect scenarios

edge-case dataset (edge-cases/**/*.yaml)
  └── case (one situation that commonly breaks implementations)
        ├── id, title, kind, risk
        ├── input values (for value/boundary cases)
        ├── scenario: given / when / expect
        ├── sources → sources/registry.yaml
        └── related_rules → rules (by ID)
```

The Markdown (`README.md` per spec) is the primary human and agent experience. The
YAML is the same content in normalized form — infrastructure for search, tooling,
test generation, and audits.

## Directory conventions

```text
specs/<domain>/<feature>/spec.yaml + README.md     # feature specs
edge-cases/<category>/<dataset>.yaml               # cross-cutting edge-case datasets
```

A directory exists because content exists — never to make the repository look large.
Specs contain feature-specific requirements; edge-case datasets contain situations that
cut across features. When a behavioral scenario is only meaningful inside one feature
(e.g., reusing a password-reset token), it lives in the feature's edge-case dataset
(e.g., `edge-cases/authentication/`).

## Rule IDs

```text
BORING-<DOMAIN>-<FEATURE>-NNN      rules        BORING-AUTH-RESET-001
BORING-EDGE-<SCOPE>-NNN            edge cases   BORING-EDGE-WEBHOOK-001
```

- Uppercase, digits, and hyphens only; segments are alphabetic tokens.
- `NNN` is a zero-padded sequence; IDs are never reused for a different meaning.
- An ID may be cited in code review, commit messages, bug reports, audit output, and
  test names: *"Failed: BORING-AUTH-RESET-003, BORING-WEBHOOK-007."*
- IDs are assigned by the validator-assisted contribution flow; do not renumber after
  publication. Retired IDs stay reserved.

## Edge-case kinds

An edge case is not merely a weird value. Boring classifies edge cases into nine kinds,
because different kinds fail differently and are verified differently.

| Kind | Definition | Examples |
|---|---|---|
| `value` | A specific input value or form that is handled badly. | empty string; a canonically equivalent Unicode form; a filename containing a path separator. |
| `boundary` | The exact limit, and one step past it. | a file exactly at the size limit; one byte above; token submitted at the instant it expires. |
| `state` | A pre-existing condition of the system that changes what should happen. | reset token already used; account deleted after token issued; subscription already cancelled when the event arrives. |
| `sequence` | Ordering matters, and real systems do not guarantee it. | webhook B arrives before webhook A; confirmation arrives before the request. |
| `retry` | The same operation happens more than once. | the same webhook delivered twice; a retried upload after partial success. |
| `concurrency` | Two or more operations interleave in time. | two password-reset completions processed simultaneously; two uploads to the same key. |
| `locale` | Internationalization: text, number, and time conventions differ by language or region. | decimal comma; RTL text; a DST transition day; Unicode domains. |
| `environment` | The infrastructure or network misbehaves around an otherwise correct implementation. | client disconnects mid-upload; network timeout after the server already processed the operation. |
| `authorization` | Identity and permission interact with the behavior. | authenticated user requests another user's resource; session that outlives a privilege revocation. |

## Risk categories

Each edge case lists the risks of getting it wrong:

`security` · `correctness` · `data-integrity` · `privacy` · `availability` ·
`performance` · `ux` · `compliance`

## Verification shape

Acceptance scenarios use a deliberately minimal semantics:

```yaml
- given: a password-reset token that has already been used
  when: the same token is submitted again
  expect:
    - the password is not changed
    - the token is rejected
```

GIVEN / WHEN / EXPECT is readable by humans, consumable by AI agents, and parseable by
future test generators — see [test-strategy.md](test-strategy.md).
