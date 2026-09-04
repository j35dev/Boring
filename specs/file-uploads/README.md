# File Uploads

> Status: draft · Updated: 2026-09-04 · [Machine-readable data](spec.yaml)

File upload is the feature that turns your server into a parser of hostile input while
your users see nothing but a drag-and-drop zone. The failure modes are unglamorous and
severe: corrupted files from interrupted transfers, one user's download served to
another, a scripted SVG executing in an admin's browser, a 40KB image that allocates
40GB during thumbnailing.

This spec defines correct upload behavior: what to validate, how to store, how to
serve, and how to survive interruptions and duplicates. It deliberately stays on the
defensive-correctness side — this is not a payload catalog.

## Scope

**Applies when** files enter the application's storage through any client interface.

**Does not apply when** the application never accepts files. Rules that depend on
optional capabilities (image decoding, archive extraction) are scoped accordingly.

## Use it like this

Tell your coding agent:

```text
Read the Boring file-upload specification (specs/file-uploads/README.md) and the
linked edge cases. Audit the upload implementation in this repository. For each
Boring rule, report: satisfied / violated / unverifiable, citing rule IDs.
```

## The rules

| ID | Level | Rule |
|---|---|---|
| [BORING-UPLOAD-001](#boring-upload-001) | MUST | Enforce size limits server-side, including the boundary behavior |
| [BORING-UPLOAD-002](#boring-upload-002) | MUST | Determine file type from content, not client claims |
| [BORING-UPLOAD-003](#boring-upload-003) | MUST | Store and serve uploads so they can never execute or render as code |
| [BORING-UPLOAD-004](#boring-upload-004) | MUST | Never use client-supplied filenames for storage paths |
| [BORING-UPLOAD-005](#boring-upload-005) | MUST | Define and enforce filename and metadata limits |
| [BORING-UPLOAD-006](#boring-upload-006) | CONSIDER | Define behavior for zero-byte and empty-content files |
| [BORING-UPLOAD-007](#boring-upload-007) | MUST | Storage keys must be unique; overwrites must be deliberate |
| [BORING-UPLOAD-008](#boring-upload-008) | MUST | Enforce authorization on retrieval, not only on upload |
| [BORING-UPLOAD-009](#boring-upload-009) | MUST | Bound image decoding before it happens |
| [BORING-UPLOAD-010](#boring-upload-010) | MUST | Bound archive extraction in every dimension |
| [BORING-UPLOAD-011](#boring-upload-011) | CONSIDER | Interrupted uploads must not leave corrupt or orphaned state |
| [BORING-UPLOAD-012](#boring-upload-012) | SHOULD | Process untrusted files in constrained contexts |

## Rules in detail

### BORING-UPLOAD-001 — Enforce size limits server-side, including the boundary behavior (MUST)

Client-side limits are UI, not validation. The server must bound request size and
memory while streaming, and must define the boundary: a file one byte over the limit is
rejected cleanly, not truncated into a corrupt object. A limit without a defined
over-limit behavior is not a limit.

- **Edge cases:** [size boundary](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-002](../../edge-cases/files/uploads.yaml)), [huge files](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-003](../../edge-cases/files/uploads.yaml)).

### BORING-UPLOAD-002 — Determine file type from content, not client claims (MUST)

Both the extension and the Content-Type header are typed by the client and trivially
spoofed. Validate against an allowlist of accepted types using the file's actual
content (magic bytes, server-side verification). When content and claim disagree, the
content wins — or the upload is rejected.

- **Edge cases:** [extension mismatch](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-010](../../edge-cases/files/uploads.yaml)), [declared-type spoofing](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-011](../../edge-cases/files/uploads.yaml)).

### BORING-UPLOAD-003 — Store and serve uploads so they can never execute or render as code (MUST)

Uploads are untrusted data that must never become active content: store outside
executable contexts, generate storage names, serve with a safe Content-Type plus
`Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`, and keep them
away from templating and execution. An uploaded SVG with a script is stored XSS against
every user who opens it.

- **Edge cases:** [SVG/HTML uploads](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-012](../../edge-cases/files/uploads.yaml)).

### BORING-UPLOAD-004 — Never use client-supplied filenames for storage paths (MUST)

Filenames are input, and hostile input at that: `../../` sequences, absolute paths,
Windows-reserved device names, control characters. Generate storage keys server-side
and keep the original name only as sanitized, display-only metadata.

- **Edge cases:** [path traversal](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-004](../../edge-cases/files/uploads.yaml)), [reserved names](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-006](../../edge-cases/files/uploads.yaml)).

### BORING-UPLOAD-005 — Define and enforce filename and metadata limits (MUST)

Filesystem components end at 255 bytes, database columns end earlier, and Unicode
expands unpredictably between them. Define limits — in the right unit (bytes vs
characters vs graphemes) — and enforce them before storage. The numbers are yours to
pick (this rule is [decision_required](../../docs/methodology.md)); having and
enforcing them is not.

### BORING-UPLOAD-006 — Define behavior for zero-byte and empty-content files (CONSIDER)

Every storage system has a zero-byte corner, and implementations that never decided
what to do there fail sideways: upload succeeds, preview crashes; or every empty file
dies in magic-byte validation with an opaque error. Decide once, enforce everywhere
(validation, storage, download, preview). Also
[decision_required](../../docs/methodology.md) — accept or reject, but consistently.

- **Edge cases:** [zero-byte file](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-001](../../edge-cases/files/uploads.yaml)).

### BORING-UPLOAD-007 — Storage keys must be unique; overwrites must be deliberate (MUST)

Two users uploading `report.pdf` must never silently overwrite each other — that is
both a correctness bug (you get each other's files) and an attack surface. Unique keys
per upload; explicit, intentional overwrite semantics where overwriting is actually the
feature.

- **Edge cases:** [same filename twice](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-007](../../edge-cases/files/uploads.yaml)), [concurrent same-key uploads](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-008](../../edge-cases/files/uploads.yaml)).

### BORING-UPLOAD-008 — Enforce authorization on retrieval, not only on upload (MUST)

Authorization checked at upload time does nothing when the file's URL is shared,
leaked, or enumerated. Every retrieval re-checks who is asking. Unknowable UUIDs are
obfuscation, not access control.

- **Edge cases:** [unauthorized retrieval](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-009](../../edge-cases/files/uploads.yaml)).

### BORING-UPLOAD-009 — Bound image decoding before it happens (MUST)

A 40KB PNG can declare a 100,000×100,000 bitmap, and some decoders will happily
allocate ~40GB before your validation runs. Check real dimensions and bound allocation
*before* decoding, then consider re-encoding to strip anything malformed. Scoped to
features that decode images server-side.

- **Edge cases:** [decompression bomb](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-013](../../edge-cases/files/uploads.yaml)).

### BORING-UPLOAD-010 — Bound archive extraction in every dimension (MUST)

Extraction limits: total uncompressed size, file count, per-file size, nesting depth —
and entry paths sanitized against traversal ("Zip Slip"). A nested zip bomb or a
`../../` entry name turns "accept .zip" into disk exhaustion or arbitrary file writes.

- **Edge cases:** [zip bomb](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-014](../../edge-cases/files/uploads.yaml)).

### BORING-UPLOAD-011 — Interrupted uploads must not leave corrupt or orphaned state (CONSIDER)

Networks drop and users close tabs mid-upload. Half-written objects must never look
complete; resumable/chunked assembly must verify all parts; temporary storage needs a
cleanup policy. The boring outcome of this rule is that "upload failed" is always
visible and never corrupts data.

- **Edge cases:** [interrupted upload](../../edge-cases/files/uploads.yaml)
  ([EDGE-FILE-015](../../edge-cases/files/uploads.yaml)).

### BORING-UPLOAD-012 — Process untrusted files in constrained contexts (SHOULD)

Antivirus scanning, thumbnails, transcoding, document preview — every server-side
parser of untrusted files is itself attack surface (media parsers are a recurring CVE
source). Run them isolated, resource-bounded, and least-privileged.

## Related edge-case datasets

- [File upload edge cases](../../edge-cases/files/uploads.yaml) — sizes, boundaries,
  hostile filenames, duplicates, concurrency, type mismatches, bombs, interruptions.
- [Unicode and text edge cases](../../edge-cases/strings/unicode.yaml) — filenames
  are text too; the Unicode dataset drives the filename rules.

## Sources

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
  — the primary application-level source for this spec (tier 2).

Full provenance: [sources/registry.yaml](../../sources/registry.yaml).
