# Changelog

All notable changes to the Boring corpus and data model are recorded here. Stable IDs
make content changes externally meaningful.

## Unreleased

- Added the Pagination spec (9 rules) with a pagination-traversal edge-case dataset — ordinary correctness (ordering, cursors, boundaries, limits), no new security doctrine.
- Refined Password Reset evidence: rule-specific locators and notes across all 14 rules and 12 state edge cases; reworked BORING-AUTH-RESET-011 as behavior-focused non-recoverability.
- Exposed the machine-readable dataset: README section for `dist/boring.json` (consume without an API or CLI) and `dist/` in the repository map.
- Phase 2: added rule and edge-case evidence with locators and support types.
- Phase 2: added schema versioning, verification visibility, applicability checks, and
  stronger relationship/documentation validation.
- Phase 2: audited all existing rules and downgraded seven overbroad MUST claims.
- Phase 2: made Password Reset the golden spec and Webhook delivery the golden edge
  dataset.
- Phase 2: redesigned the README and added contributor issue templates, examples, and
  adversarial review guidance.
