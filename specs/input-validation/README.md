# Input, Text & Unicode

> Status: draft · Updated: 2026-09-04 · [Machine-readable data](spec.yaml)

Every application is a text-processing application. Names, emails, addresses, codes,
searches, and content all arrive as strings — and strings are where the ordinary
assumptions ("a character is a byte", "trimming whitespace is harmless", "two strings
that look equal are equal") break. These bugs are rarely dramatic in a demo and
constantly embarrassing in production: duplicate accounts that differ by an invisible
character, truncated emoji, look-alike usernames, a €1.234 vs 1234 amount.

This spec defines the behavior correct text handling must have. Several rules are
deliberately [decision_required](../../docs/methodology.md): the right maximum
length or whitespace policy is a product decision — what Boring requires is that the
policy *exists and is enforced consistently*.

## Scope

**Applies when** the application accepts, stores, compares, transforms, or displays
text from users or external systems.

## Use it like this

Tell your coding agent:

```text
Read the Boring input/text specification (specs/input-validation/README.md) and the
linked Unicode and email edge-case datasets. Audit text handling in this repository.
For each Boring rule, report: satisfied / violated / unverifiable, citing rule IDs.
```

## The rules

| ID | Level | Rule |
|---|---|---|
| [BORING-INPUT-001](#boring-input-001) | MUST | Define and apply a Unicode normalization policy |
| [BORING-INPUT-002](#boring-input-002) | MUST | Know the difference between bytes, code points, and grapheme clusters |
| [BORING-INPUT-003](#boring-input-003) | MUST | Validate the decoded and canonical form, at the trust boundary |
| [BORING-INPUT-004](#boring-input-004) | MUST | Define per-field length limits in the right unit |
| [BORING-INPUT-005](#boring-input-005) | MUST | Define a policy for control characters and invalid encodings |
| [BORING-INPUT-006](#boring-input-006) | CONSIDER | Define a whitespace policy per field |
| [BORING-INPUT-007](#boring-input-007) | MUST | Define a policy for zero-width and invisible characters |
| [BORING-INPUT-008](#boring-input-008) | SHOULD | Guard public identifiers against mixed-script and confusable spoofing |
| [BORING-INPUT-009](#boring-input-009) | MUST | Preserve bidirectional text and render it isolated |
| [BORING-INPUT-010](#boring-input-010) | SHOULD | Case-insensitive comparison must use case folding, not naive casing |
| [BORING-INPUT-011](#boring-input-011) | SHOULD | Parse numbers, dates, and structured values with explicit grammars |
| [BORING-INPUT-012](#boring-input-012) | SHOULD | Use maintained parsers for structured identifiers |

## Rules in detail

### BORING-INPUT-001 — Define and apply a Unicode normalization policy (MUST)

`é` can be one code point (U+00E9) or two (e + U+0301). Both render identically and
Unicode calls them canonically equivalent — conforming implementations treat them as
equal (UAX #15). Pick a normalization form (NFC is the usual choice), apply it before
comparisons, uniqueness checks, and storage, and never assume input arrived normalized
— normalization isn't even closed under concatenation.

- **Edge cases:** [canonically equivalent names](../../edge-cases/strings/unicode.yaml)
  ([EDGE-TEXT-001](../../edge-cases/strings/unicode.yaml)), full-width forms
  ([EDGE-TEXT-002](../../edge-cases/strings/unicode.yaml)).

### BORING-INPUT-002 — Know the difference between bytes, code points, and grapheme clusters (MUST)

One user-perceived character can be 1 grapheme, several code points, and dozens of
bytes. Storage cares about bytes; password rules count code points (NIST SP 800-63B);
UI counters and truncation should care about grapheme clusters (UAX #29), where emoji
sequences are single units. Truncating to "30 characters" that slices a family emoji in
half is the canonical output of not having chosen a unit.

### BORING-INPUT-003 — Validate the decoded and canonical form, at the trust boundary (MUST)

Validation that runs before decoding validates the wrong string. Validate after URL
decoding, HTML unescaping, normalization, and parsing — when data enters your trust
boundary. This is the core of OWASP's input validation guidance, and the reason
"we block `<script>`" is weaker than it sounds.

### BORING-INPUT-004 — Define per-field length limits in the right unit (MUST)

Every field gets a maximum, chosen deliberately (this rule is
[decision_required](../../docs/methodology.md)), documented, and enforced in the
unit that field's consumers need. The failure mode is always the same: unbounded input
accepted at the API and breaking at the weakest downstream consumer.

### BORING-INPUT-005 — Define a policy for control characters and invalid encodings (MUST)

Control characters and invalid encodings (unpaired surrogates, invalid UTF-8) break
parsers, logs, and terminals downstream. Decide: reject, replace, or strip —
consistently — and never let an invalid sequence corrupt stored data.

### BORING-INPUT-006 — Define a whitespace policy per field (CONSIDER)

Trim or preserve, per field, deliberately: `" bob"` and `"bob"` becoming different
accounts is a data bug; storing whitespace-only bios is a content bug. Include
non-ASCII whitespace (NBSP, zero-width space) in the policy — ASCII trimming misses
most of Unicode's space-like characters. [Decision_required](../../docs/methodology.md).

### BORING-INPUT-007 — Define a policy for zero-width and invisible characters (MUST)

Zero-width characters make byte-different strings look identical — the classic
coupon-code failure and username-spoofing primitive. Unicode's security work restricts
these in identifiers for exactly this reason. Strip, preserve, or reject — but decide,
and never rely on human eyeballs as the discriminator.

- **Edge cases:** [zero-width space](../../edge-cases/strings/unicode.yaml)
  ([EDGE-TEXT-005](../../edge-cases/strings/unicode.yaml)), BOM-as-content
  ([EDGE-TEXT-007](../../edge-cases/strings/unicode.yaml)).

### BORING-INPUT-008 — Guard public identifiers against mixed-script and confusable spoofing (SHOULD)

For public handles and names, use UTS #39's confusable detection (skeleton comparison)
and mixed-script detection to *notice* look-alikes (`раypal` with Cyrillic letters) and
apply a documented allow/block policy. Not every application needs the restriction —
every application with public identities needs the decision.

### BORING-INPUT-009 — Preserve bidirectional text and render it isolated (MUST)

RTL text must survive storage intact and render inside directional isolates, so an RTL
name displays correctly in a Latin UI and bidi control characters in user text cannot
visually reorder your interface or logs.

- **Edge cases:** [bidi overrides in usernames](../../edge-cases/strings/unicode.yaml)
  ([EDGE-TEXT-008](../../edge-cases/strings/unicode.yaml)).

### BORING-INPUT-010 — Case-insensitive comparison must use case folding, not naive casing (SHOULD)

`toLowerCase()` is a locale-sensitive transformation, and the Turkish dotless-I family
makes naive comparisons wrong. Caseless matching has a defined mechanism — case folding
(The Unicode Standard). Use it for identity comparisons; reserve locale-sensitive
casing for genuinely locale-specific display.

### BORING-INPUT-011 — Parse numbers, dates, and structured values with explicit grammars (SHOULD)

`"010"`, `"+42"`, `"1e5"`, `"1.234,56"`, `" 42 "` — every parser draws the line
somewhere; homemade parsers draw it inconsistently. Define the grammar (CLDR defines
the locale conventions), use tested implementations, and fail clearly.

- **See also:** the [numeric boundaries dataset](../../edge-cases/numbers/boundaries.yaml).

### BORING-INPUT-012 — Use maintained parsers for structured identifiers (SHOULD)

Email syntax spans RFC 5321/5322, internationalized addresses (SMTPUTF8), and IDNA
domains; HTML defines a pragmatic subset as a willful violation of RFC 5322. No
application needs a homemade email regex — every one both rejects valid users and
accepts malformed input. Choose your policy (including how weird you'll accept) and
implement it with maintained parsers.

- **Edge cases:** the [email dataset](../../edge-cases/email/addresses.yaml) —
  plus addressing, quoted local parts, IDN domains, length boundaries, and more.

## Related edge-case datasets

- [Strings & Unicode](../../edge-cases/strings/unicode.yaml) — the value-level cases.
- [Email addresses](../../edge-cases/email/addresses.yaml) — identifier parsing.
- [Numeric boundaries](../../edge-cases/numbers/boundaries.yaml) — numbers-as-text.
- [Date & time](../../edge-cases/date-time/timestamps.yaml) — temporal text.

## Sources

- [UAX #15: Unicode Normalization Forms](https://www.unicode.org/reports/tr15/) (tier 1)
- [UAX #29: Unicode Text Segmentation](https://www.unicode.org/reports/tr29/) (tier 1)
- [UAX #9: Unicode Bidirectional Algorithm](https://www.unicode.org/reports/tr9/) (tier 1)
- [UTS #39: Unicode Security Mechanisms](https://www.unicode.org/reports/tr39/) (tier 1)
- [UTS #36: Unicode Security Considerations](https://www.unicode.org/reports/tr36/tr36-15.html) (tier 1)
- [UTS #46: Unicode IDNA Compatibility Processing](https://www.unicode.org/reports/tr46/) (tier 1)
- [The Unicode Standard](https://www.unicode.org/versions/latest/) — case folding,
  code point semantics (tier 1)
- [Unicode CLDR](https://cldr.unicode.org/) — locale conventions for numbers (tier 1)
- [RFC 5321](https://www.rfc-editor.org/rfc/rfc5321) / [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322) /
  [RFC 6531](https://www.rfc-editor.org/rfc/rfc6531) / [RFC 5890](https://www.rfc-editor.org/rfc/rfc5890) —
  email and domain syntax (tier 1)
- [WHATWG HTML Standard](https://html.spec.whatwg.org/multipage/) — email input
  validation as a willful violation (tier 1)
- [WHATWG URL Standard](https://url.spec.whatwg.org/) — URL parsing (tier 1)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
  (tier 2)
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) — code-point
  counting for passwords (tier 2)

Full provenance: [sources/registry.yaml](../../sources/registry.yaml).
