# Phase 2 evidence audit

Audited: 2026-09-04 · corpus at audit time: 5 specs, 63 rules, 107 edge cases,
38 registered sources.

This is the review ledger for Phase 2. Every existing rule was read with its cited
registry entries and checked for source support, normative level, concrete thresholds,
applicability, atomicity, and verification visibility. The audit used the primary
OWASP, NIST, IETF, Unicode, WHATWG, IANA, Stripe, GitHub, and MDN documents named in
the registry. Boring text is an interpretation of those sources; it is not a
replacement for them.

## Result

| Final level | Rules | Audit meaning |
|---|---:|---|
| MUST | 33 | Directly supported or a narrow, derived safety invariant within the stated scope |
| SHOULD | 24 | Strong default, but a legitimate product, provider, or threat-model exception exists |
| CONSIDER | 6 | A policy or architecture decision that must be made deliberately |

All 63 rules remain `draft`. A draft rule is published for review; it is not a
claim of industry consensus.

## Material changes

- `BORING-AUTH-RESET-007`, `008`, and `009` were downgraded from MUST to SHOULD.
  The sources support abuse controls, applying the password policy consistently, and
  session handling as strong guidance, but do not establish one universal product
  behavior for every recovery flow.
- `BORING-UPLOAD-005` and `009` were downgraded from MUST to SHOULD. Filename/metadata
  limits and image-decoder bounds are important defaults, but the exact policy depends
  on storage constraints and processing architecture. Image resource exhaustion now
  cites the OWASP Denial of Service guidance as well as the upload guidance.
- `BORING-WEBHOOK-003` and `007` were downgraded from MUST to SHOULD. Timestamp replay
  tolerance and acknowledgement of unknown events depend on the provider contract and
  the consumer's policy.
- Unsupported-looking universal thresholds were removed from reset-token entropy,
  reset-token lifetime, session entropy, and session-timeout statements. Numeric
  guidance remains in source notes where it is genuinely source-specific; rules now
  require a documented threat-model or risk-based choice instead.

## Evidence model

Every rule and edge case now has an `evidence` entry containing:

```yaml
evidence:
  - source: OWASP-FORGOT-PASSWORD
    locator: "Forgot Password Request; User Resets Password"
    support: direct
    note: "What the source supports and how Boring scoped the interpretation."
```

`direct` means the source substantially establishes the behavior. `derived` means
Boring combines source material into a clearly labeled interpretation. `contextual`
means the source demonstrates a failure mode, provider behavior, or operational fact;
it cannot by itself justify a universal MUST or SHOULD. The compact `sources` list is
retained as an index for simple consumers; `evidence` is the provenance that explains
how each claim is supported.

## Remaining uncertainty

Some vendor pages change their headings and delivery guarantees over time. Locators
are therefore section-level labels rather than line offsets, and provider-specific
evidence remains contextual or derived. Maintainers should re-check those pages before
promoting a rule to `reviewed` or `stable`. No rule was promoted automatically by this
audit.
