# Password Reset

> Status: draft · Updated: 2026-09-04 · [Machine-readable data](spec.yaml)

Password reset is the most security-critical flow in most applications, and the one
most likely to be built in ten minutes: one form, one email, one token. The
consequences of getting it wrong are total — a reset flow that reveals which emails
have accounts, or honors a token twice, is an account-takeover primitive, not a
feature bug.

This spec defines the behavior a correct reset flow must implement. It is
framework-neutral and applies whether you build it yourself or configure it in a
framework — the behavior requirements are the same either way.

## Scope

**Applies when** public users or existing accounts can request a password reset.

**Does not apply when** authentication is entirely delegated to an external identity
provider that owns the reset flow. Applications with no passwords (passkeys or
magic-links only) should still read this spec: equivalent recovery flows hit the same
requirements.

## Use it like this

**Auditing an existing implementation** — tell your coding agent:

```text
Read the Boring password-reset specification (specs/authentication/password-reset/README.md)
and the linked edge cases. Audit the password-reset implementation in this repository.
For each Boring rule, report: satisfied / violated / unverifiable, with file references.
Cite Boring rule IDs in your findings.
```

**Implementing a new one:**

```text
Implement password reset according to the Boring password-reset specification.
Before finishing, review all linked Boring edge cases and add regression tests for
the applicable acceptance scenarios. Mention any Boring rule you intentionally do
not support.
```

## Quick checklist

In a minute, confirm that the flow has answers for:

- [BORING-AUTH-RESET-001](#boring-auth-reset-001) — indistinguishable responses
- [BORING-AUTH-RESET-002](#boring-auth-reset-002) — unpredictable credentials
- [BORING-AUTH-RESET-003](#boring-auth-reset-003) — bounded lifetime
- [BORING-AUTH-RESET-004](#boring-auth-reset-004) — single-use redemption
- [BORING-AUTH-RESET-007](#boring-auth-reset-007) — abuse controls without lockout
- [BORING-AUTH-RESET-009](#boring-auth-reset-009) — existing-session policy
- [BORING-AUTH-RESET-013](#boring-auth-reset-013) — multiple-request policy

The YAML is the canonical record of every rule's evidence, applicability, failure
modes, and verification scenarios. This page is the deliberately human-shaped guide.

## The rules

| ID | Level | Rule |
|---|---|---|
| [BORING-AUTH-RESET-001](#boring-auth-reset-001) | MUST | Reset flows must not reveal whether an account exists |
| [BORING-AUTH-RESET-002](#boring-auth-reset-002) | MUST | Reset tokens must be unguessable |
| [BORING-AUTH-RESET-003](#boring-auth-reset-003) | MUST | Reset tokens must expire |
| [BORING-AUTH-RESET-004](#boring-auth-reset-004) | MUST | Reset tokens must be single-use |
| [BORING-AUTH-RESET-005](#boring-auth-reset-005) | MUST | The account must not be modified until a valid token is presented |
| [BORING-AUTH-RESET-006](#boring-auth-reset-006) | MUST | Reset completion must be bound to the token's account |
| [BORING-AUTH-RESET-007](#boring-auth-reset-007) | SHOULD | Reset endpoints must be throttled without enabling enumeration |
| [BORING-AUTH-RESET-008](#boring-auth-reset-008) | SHOULD | The new password must satisfy the same policy as normal credential creation |
| [BORING-AUTH-RESET-009](#boring-auth-reset-009) | SHOULD | Completing a reset must end existing sessions |
| [BORING-AUTH-RESET-010](#boring-auth-reset-010) | SHOULD | Notify the account owner when the password changes |
| [BORING-AUTH-RESET-011](#boring-auth-reset-011) | SHOULD | Reset-token values at rest must not be recoverable |
| [BORING-AUTH-RESET-012](#boring-auth-reset-012) | CONSIDER | Treat reset links as secrets during transport |
| [BORING-AUTH-RESET-013](#boring-auth-reset-013) | CONSIDER | Define the policy for multiple outstanding reset requests |
| [BORING-AUTH-RESET-014](#boring-auth-reset-014) | SHOULD | Post-reset redirects must not be attacker-controlled |

## Rules in detail

### BORING-AUTH-RESET-001 — Reset flows must not reveal whether an account exists (MUST)

The reset request is the cheapest enumeration oracle an application can expose. The
message, the HTTP status, and the timing must be equivalent whether or not the account
exists. Timing matters as much as text: running password-hash verification or queueing
email only for real accounts produces a measurable difference. Watch throttling too —
applying rate limits only to known accounts is enumeration with extra steps.

- **Fails when:** "we've sent a link" vs "no such user"; 200 vs 404; per-account
  throttling that reveals known addresses.
- **Edge cases:** deleted accounts, OAuth-only accounts, and timing side channels
  ([password-reset edge cases](../../../edge-cases/authentication/password-reset-state.yaml)).

### BORING-AUTH-RESET-002 — Reset tokens must be unguessable (MUST)

Tokens come from a cryptographically secure random generator with enough strength for
the application's threat model. Not user ID + timestamp, not a hash of known data, not
a PRNG seeded per request. A guessable token is an account-takeover primitive that
needs no email access at all.

### BORING-AUTH-RESET-003 — Reset tokens must expire (MUST)

A reset token is a temporary credential and must be rejected after a bounded lifetime.
Choose and document that lifetime for the recovery channel and threat model; Boring
does not prescribe one universal number. Critically, expiry is checked at completion
time, not at request time.

- **Edge cases:** the exact expiry boundary is a classic off-by-one
  ([EDGE-AUTH-RESET-004](../../../edge-cases/authentication/password-reset-state.yaml)).

### BORING-AUTH-RESET-004 — Reset tokens must be single-use (MUST)

Successful use invalidates the token, and a second submission must be rejected —
including when two completions race each other. A token that works twice is a repeated
takeover key for as long as it lives.

- **Edge cases:** token reuse; concurrent completions
  ([EDGE-AUTH-RESET-001](../../../edge-cases/authentication/password-reset-state.yaml),
  [EDGE-AUTH-RESET-005](../../../edge-cases/authentication/password-reset-state.yaml)).

### BORING-AUTH-RESET-005 — The account must not be modified until a valid token is presented (MUST)

Validation happens at the mutating step: token existence, expiry, use state, and
account binding are all checked when the password actually changes. Any design that
"pre-approves" the account at request time (a flag the completion step trusts) has
moved the security boundary to the wrong place.

### BORING-AUTH-RESET-006 — Reset completion must be bound to the token's account (MUST)

The token determines whose password changes. If the completion form also accepts an
email or user ID, a single valid token can be aimed at any account — a mass-assignment
bug with takeover as the impact. Client-supplied identifiers never override
token-derived identity.

- **Edge cases:** email changed after token issue; identity-normalization ambiguity
  ([EDGE-AUTH-RESET-008](../../../edge-cases/authentication/password-reset-state.yaml),
  [EDGE-AUTH-RESET-012](../../../edge-cases/authentication/password-reset-state.yaml)).

### BORING-AUTH-RESET-007 — Reset endpoints must be throttled without enabling enumeration (SHOULD)

Throttle reset requests per account and per source — they are an email-bombing vector
and a token brute-force surface. Two constraints make this subtle: throttling must not
differentiate known from unknown accounts (see rule 001), and reset floods must never
lock accounts, or the endpoint becomes a denial-of-service on login.

### BORING-AUTH-RESET-008 — The new password must satisfy the same policy as normal credential creation (SHOULD)

Reset completion *is* password creation: minimum length, blocklists of common and
breached passwords, confirmation — the whole policy, not a weakened "emergency" variant.
Modern guidance (NIST SP 800-63B) is minimum length plus breach checking, and no
composition rules; whatever your policy is, reset enforces it identically.

### BORING-AUTH-RESET-009 — Completing a reset must end existing sessions (SHOULD)

Sessions from before the reset may belong to whoever held the old credential. End them
— automatically, or by offering the user the choice — and do not log in automatically
after reset: the person holding the token is not always the account owner.

- **Related:** [Sessions spec, BORING-AUTH-SESSION-007](../sessions/README.md)
  (credential changes generally), session edge case
  [EDGE-AUTH-SESSION-001](../../../edge-cases/authentication/sessions-state.yaml).

### BORING-AUTH-RESET-010 — Notify the account owner when the password changes (SHOULD)

The change notification is the account owner's detection signal. Send it to the address
of record — and keep it inert: no new password, no token, and above all no "click here
to set a new password" link, which would be a second takeover key.

### BORING-AUTH-RESET-011 — Reset-token values at rest must not be recoverable (SHOULD)

A read-only breach must not yield working tokens: keep only a non-recoverable
representation (a hash verified by comparison) or equivalent secret
infrastructure, each bound to exactly one account. Short codes need a slow,
salted hash plus throttling; high-entropy tokens still must not sit in plaintext
columns, backups, or logs.

### BORING-AUTH-RESET-012 — Treat reset links as secrets during transport (CONSIDER)

Email links are the default UX, but the URL *is* the credential: browser history,
server and proxy logs, Referer headers, mail-client link previews, and analytics all
see it. Deliberately decide your delivery model and design the surrounding systems so
that none of those channels retains a still-valid token.

### BORING-AUTH-RESET-013 — Define the policy for multiple outstanding reset requests (CONSIDER)

What happens when a reset is requested while another token is still outstanding? Strong
default: newest-wins — a new request invalidates previous tokens. The essential
requirement is that the behavior is *defined and enforced*, because ten requests leaving
ten working keys is a real bug that real applications ship. This rule is
[decision_required](../../../docs/methodology.md): define your policy; we don't pick it
for you.

### BORING-AUTH-RESET-014 — Post-reset redirects must not be attacker-controlled (SHOULD)

The page after a reset ("your password was changed, continue…") is a high-trust moment
and therefore a prime open-redirect target. Fix the target or validate it against an
allowlist — including protocol-relative URLs that defeat suffix checks.

## Related edge-case datasets

- [Authentication state: password reset](../../../edge-cases/authentication/password-reset-state.yaml)
  — reuse, expiry boundaries, concurrent completions, deleted/OAuth-only/banned
  accounts, email changes, timing side channels, token leakage, identity ambiguity.
- [Authentication state: sessions](../../../edge-cases/authentication/sessions-state.yaml)
  — what happens to sessions around credential changes.
- [Email addresses](../../../edge-cases/email/addresses.yaml) — the addresses reset
  requests arrive with are their own edge-case surface.

## Verification and evidence

Each rule in [spec.yaml](spec.yaml) carries a machine-readable verification block with
`automatable`, `visibility`, and `given / when / expect` scenarios. Its `evidence`
entries identify the source, a locator, and whether Boring is reporting direct,
derived, or contextual support. Start with the linked scenario IDs, then read the
source registry before treating a product-specific decision as a universal rule.

## Status

This is the reference-quality **golden spec** for the repository. It is still `draft`:
new specs should generally match its evidence, scope, failure-mode, edge-case, and
verification structure before they are considered ready for review.

## Sources

- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
  — the primary application-level source for this spec (tier 2).
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
  — generic error messages, password policy, re-authentication (tier 2).
- [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/)
  — V6 (Authentication: credential reset, notifications) and V7 (Session Management:
  session termination) (tier 2).
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) — password
  policy: length, blocklists, rate limiting (tier 2).
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
  — secure storage of credentials, applied to tokens (tier 2).
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
  — unvalidated redirects (tier 2).

Full provenance: [sources/registry.yaml](../../../sources/registry.yaml).
