# Agent audit prompt

Copy this into an agent working in a repository that implements the feature:

```text
Read the relevant Boring specification and every linked edge-case dataset.
For each applicable rule, inspect the implementation and report PASS, FAIL, or
UNKNOWN using the Boring rule ID. Cite the files and lines you inspected. For every
FAIL, identify the linked failure mode and propose a project-native regression test.
For every UNKNOWN, say what evidence is missing. Respect applies_when,
does_not_apply_when, and decision_required; do not turn a product decision into a
universal requirement.
```

## Example

Use it with [Password Reset](../specs/authentication/password-reset/README.md) and
[its edge cases](../edge-cases/authentication/password-reset-state.yaml).
