# Review policy

## Maturity

- `draft` — merged and available for review; evidence or interpretation has not yet
  been independently checked.
- `reviewed` — a reviewer other than the author, or an explicit adversarial review
  pass, checked evidence, wording, scope, and scenarios.
- `stable` — strong evidence, stable wording, and no unresolved interpretation issue.
- `deprecated` — retained for ID stability but no longer recommended; link a replacement
  with `superseded_by` when one exists.

Merging is publication, not certification. A rule may be useful while still being
`draft`.

## Adversarial pass

For every MUST or SHOULD, construct a legitimate application where it should not apply.
If one exists, narrow `applies_when`, add `does_not_apply_when`, downgrade the level,
or make it `decision_required`. Check vendor leakage, concrete numbers, duplicated
requirements, contradictions, and whether the scenario can actually be verified.

Published IDs are never reused for a different meaning. Deprecate the old ID and add a
new one when the behavior materially changes.
