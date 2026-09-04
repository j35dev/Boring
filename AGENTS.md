# AGENTS.md

Guidance for AI agents working **in this repository** (improving Boring itself):

- Read [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/methodology.md](docs/methodology.md)
  before proposing content changes.
- AI is a research and writing assistant here, not a source. Every new rule or edge
  case needs a registered source (tier 1–5) that you have actually located and read.
- Keep content atomic: one testable idea per rule; one situation per edge case.
- Never assign normative levels (`MUST`/`SHOULD`) without normative or authoritative
  support; contextual policies must be `decision_required`, not universal requirements.
- Keep `README.md` and `spec.yaml` in sync per spec, preserve ID stability, and run
  `npm run validate` before finishing.
- Every rule and important edge case needs `evidence` with a registered source,
  locator, support type, and note; contextual evidence cannot justify MUST/SHOULD.
- Treat `spec.yaml` and edge-case YAML as canonical. Run `npm run build:dataset` when
  structured data changes so `dist/boring.json` stays deterministic.

If you are an agent **consuming Boring** to implement or audit a feature in someone
else's codebase, start at [README.md](README.md) ("Using Boring") and the relevant
`specs/<feature>/README.md`.
