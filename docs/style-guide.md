# Editorial style guide

Boring rules should be specific, neutral, framework-independent, technically precise,
short, and testable where possible. Write the requirement in `statement`, the reason
in `why`, and observable violations in `failure_modes`.

Prefer:

```text
The server must reject an upload after the configured size limit is exceeded.
```

Avoid:

```text
Always validate files properly.
```

Avoid unqualified words such as `simply`, `obviously`, `always`, `never`, `best
practice`, `secure`, `properly`, and `correctly` unless the term is defined and the
source genuinely justifies it. Keep one testable behavior per rule and one situation
per edge case. Say `decision_required` when a legitimate application must choose.
