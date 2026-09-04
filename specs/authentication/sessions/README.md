# Sessions

> Status: draft · Updated: 2026-09-04 · [Machine-readable data](spec.yaml)

Session management is the connective tissue of every authenticated application, and it
fails quietly: sessions that never expire, logouts that only clear a cookie, attacker
sessions that survive a password change. Each individual defect looks minor; together
they decide whether "log out" and "change password" actually mean anything.

This spec defines the behavior a correct session implementation must have — for both
server-side sessions and self-contained tokens (JWTs/bearer), with cookie-specific
requirements explicitly scoped to cookies.

## Scope

**Applies when** the application maintains authenticated state across requests.

**Does not apply when** the application is fully stateless per request. Token-based
rules (BORING-AUTH-SESSION-012) apply wherever bearer tokens or JWTs are used.

## Use it like this

Tell your coding agent:

```text
Read the Boring sessions specification (specs/authentication/sessions/README.md) and
the linked edge cases. Audit session management in this repository. For each Boring
rule, report: satisfied / violated / unverifiable, citing rule IDs.
```

## The rules

| ID | Level | Rule |
|---|---|---|
| [BORING-AUTH-SESSION-001](#boring-auth-session-001) | MUST | Session identifiers must be unguessable and carry no meaning |
| [BORING-AUTH-SESSION-002](#boring-auth-session-002) | MUST | Regenerate the session identifier at authentication and privilege changes |
| [BORING-AUTH-SESSION-003](#boring-auth-session-003) | MUST | Logout must invalidate the session server-side |
| [BORING-AUTH-SESSION-004](#boring-auth-session-004) | MUST | Sessions must have enforced idle and absolute timeouts |
| [BORING-AUTH-SESSION-005](#boring-auth-session-005) | MUST | Cookie-based sessions must set Secure and HttpOnly |
| [BORING-AUTH-SESSION-006](#boring-auth-session-006) | SHOULD | Cookie-based sessions must set a SameSite policy |
| [BORING-AUTH-SESSION-007](#boring-auth-session-007) | MUST | Credential changes must invalidate existing sessions |
| [BORING-AUTH-SESSION-008](#boring-auth-session-008) | MUST | Privilege changes must take effect in active sessions |
| [BORING-AUTH-SESSION-009](#boring-auth-session-009) | SHOULD | Sensitive operations must require re-authentication |
| [BORING-AUTH-SESSION-010](#boring-auth-session-010) | SHOULD | Users must be able to view and terminate their sessions |
| [BORING-AUTH-SESSION-011](#boring-auth-session-011) | MUST | Session identifiers must not travel in URLs |
| [BORING-AUTH-SESSION-012](#boring-auth-session-012) | SHOULD | Token-based sessions need a revocation story and full claim verification |

## Rules in detail

### BORING-AUTH-SESSION-001 — Session identifiers must be unguessable and carry no meaning (MUST)

Use a cryptographically secure generator with enough strength for the application's
threat model, and nothing else: no username, no role, no timestamp structure. A
predictable identifier is a login as anyone; a meaningful one leaks data into every
log line that records it.

### BORING-AUTH-SESSION-002 — Regenerate the session identifier at authentication and privilege changes (MUST)

This is the session-fixation defense. An identifier the attacker planted before login
must be replaced at login, and an identifier issued at one privilege level must be
replaced when the level changes. OWASP marks regeneration as mandatory in both cases.

- **Edge cases:** [EDGE-AUTH-SESSION-003](../../../edge-cases/authentication/sessions-state.yaml)
  (fixation via a pre-authentication session).

### BORING-AUTH-SESSION-003 — Logout must invalidate the session server-side (MUST)

Clearing the cookie is theater: any copy of the token keeps working. Destroy the
server-side state — or, for self-contained tokens, revoke through the mechanism your
design provides (see rule 012). ASVS makes the same demand (V7 7.4.1).

- **Edge cases:** [EDGE-AUTH-SESSION-002](../../../edge-cases/authentication/sessions-state.yaml)
  (logout clears the cookie only).

### BORING-AUTH-SESSION-004 — Sessions must have enforced idle and absolute timeouts (MUST)

Two clocks, both server-enforced: inactivity and absolute lifetime. Select and document
the bounds from the application's risk, session purpose, and operational constraints.
"Remember me" is a deliberate long-lived-session design — document it and compensate
with rotation and revocation, not by quietly removing expiry.

- **Edge cases:** [EDGE-AUTH-SESSION-004](../../../edge-cases/authentication/sessions-state.yaml)
  (timeout never enforced; boundary at expiry).

### BORING-AUTH-SESSION-005 — Cookie-based sessions must set Secure and HttpOnly (MUST)

OWASP calls both mandatory: Secure keeps the identifier off cleartext connections,
HttpOnly keeps it away from scripts after an XSS. Unscoped: this rule applies to
cookies only.

### BORING-AUTH-SESSION-006 — Cookie-based sessions must set a SameSite policy (SHOULD)

Set SameSite=Strict or Lax explicitly — never rely on browser defaults, which have
shifted across browser versions. SameSite=None requires Secure. This complements CSRF
defenses; it does not replace them (OWASP CSRF Cheat Sheet).

### BORING-AUTH-SESSION-007 — Credential changes must invalidate existing sessions (MUST)

The typical reason to change a password is that someone else may have it. Ending all
pre-existing sessions (automatically, or by explicit user choice) is what makes the
change effective — for resets too (see
[BORING-AUTH-RESET-009](../password-reset/README.md), which applies this rule to the
reset flow).

- **Edge cases:** [EDGE-AUTH-SESSION-001](../../../edge-cases/authentication/sessions-state.yaml)
  (sessions survive a password change).

### BORING-AUTH-SESSION-008 — Privilege changes must take effect in active sessions (MUST)

A demoted admin, a revoked employee, a disabled account — none of them should keep
working through a session opened before the change. Re-evaluate permissions per
request, refresh the session's authorization, or terminate it — but the window must be
bounded and documented, not "whenever the session happens to expire."

- **Edge cases:** [EDGE-AUTH-SESSION-005](../../../edge-cases/authentication/sessions-state.yaml)
  (stale privilege after demotion).

### BORING-AUTH-SESSION-009 — Sensitive operations must require re-authentication (SHOULD)

Changing the password or email, changing MFA, managing sessions — these operations
control the account itself and should demand fresh credentials rather than riding an
existing (possibly hijacked or unattended) session.

### BORING-AUTH-SESSION-010 — Users must be able to view and terminate their sessions (SHOULD)

Show active sessions (device, recency) and let users kill any of them. This is the
user's own containment tool for a lost laptop or a session they don't recognize —
"log out everywhere" needs to actually invalidate server-side state (rule 003).

### BORING-AUTH-SESSION-011 — Session identifiers must not travel in URLs (MUST)

URLs escape the application's control: they land in Referer headers of third-party
assets, browser history, server logs, and shared links. OWASP documents exactly this
leakage path for URL-based session IDs. Cookies and Authorization headers are the
acceptable transports.

### BORING-AUTH-SESSION-012 — Token-based sessions need a revocation story and full claim verification (SHOULD)

A JWT is valid until its claims say otherwise, and deleting server state doesn't stop
it. If self-contained tokens act as sessions, they need either short lifetimes with
rotation or a real revocation/denylist mechanism — and every use must verify signature,
issuer, audience, and expiry (RFC 8725). Don't store them in web storage; any script
can read it.

- **Edge cases:** [EDGE-AUTH-SESSION-006](../../../edge-cases/authentication/sessions-state.yaml)
  (stolen bearer token valid until expiry).

## Related edge-case datasets

- [Authentication state: sessions](../../../edge-cases/authentication/sessions-state.yaml)
  — session survival, logout theater, fixation, timeout boundaries, stale privileges,
  unrevocable tokens.
- [Authentication state: password reset](../../../edge-cases/authentication/password-reset-state.yaml)
  — reset flows interact with sessions in almost every rule above.

## Sources

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
  — the primary application-level source for this spec (tier 2).
- [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/)
  — V7 Session Management (timeouts, termination, session control), V9 Self-contained
  Tokens (tier 2).
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
  — re-authentication for sensitive features (tier 2).
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
  — session behavior around resets (tier 2).
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
  — SameSite/CSRF interplay (tier 2).
- [RFC 8725: JWT Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725) —
  claim and algorithm validation (tier 1).

Full provenance: [sources/registry.yaml](../../../sources/registry.yaml).
