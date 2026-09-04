# Webhooks

> Status: draft · Updated: 2026-09-04 · [Machine-readable data](spec.yaml)

A webhook endpoint looks trivial — a route, a parse, a side effect. What makes it hard
is that webhook delivery is distributed-systems behavior wearing a friendly costume:
deliveries repeat, arrive out of order, arrive late, arrive concurrently, and stop
arriving entirely when your consumer is down. Simple implementations ignore all of it,
and the bugs surface weeks later as duplicated orders, lost events, and silently
divergent state.

This spec defines what a correct webhook *consumer* must do. It is provider-neutral;
provider-specific behavior (Stripe's retry window, GitHub's 10-second response
deadline) is cited as evidence, not promoted to universal rules.

## Scope

**Applies when** your application exposes an HTTP endpoint that receives events from a
provider (payment processor, VCS host, notification service, or your own other service).

**Does not apply when** your application only *sends* webhooks, or consumes events via
polling/queues without HTTP delivery semantics.

## Use it like this

Tell your coding agent:

```text
Read the Boring webhooks specification (specs/webhooks/README.md) and the linked
edge cases. Audit the webhook consumer in this repository. For each Boring rule,
report satisfied / violated / unverifiable, citing rule IDs.
```

## The rules

| ID | Level | Rule |
|---|---|---|
| [BORING-WEBHOOK-001](#boring-webhook-001) | MUST | Process deliveries idempotently |
| [BORING-WEBHOOK-002](#boring-webhook-002) | MUST | Verify sender authenticity and fail closed |
| [BORING-WEBHOOK-003](#boring-webhook-003) | SHOULD | Enforce replay windows when the scheme embeds a timestamp |
| [BORING-WEBHOOK-004](#boring-webhook-004) | SHOULD | Acknowledge quickly and process asynchronously |
| [BORING-WEBHOOK-005](#boring-webhook-005) | MUST | Treat 2xx as the only success signal and never acknowledge before the delivery is durable |
| [BORING-WEBHOOK-006](#boring-webhook-006) | MUST | Process events order-independently |
| [BORING-WEBHOOK-007](#boring-webhook-007) | SHOULD | Acknowledge unknown event types gracefully |
| [BORING-WEBHOOK-008](#boring-webhook-008) | SHOULD | Persist deliveries before processing |
| [BORING-WEBHOOK-009](#boring-webhook-009) | MUST | Treat event payloads as untrusted input |
| [BORING-WEBHOOK-010](#boring-webhook-010) | SHOULD | Support signing-secret rotation without dropped deliveries |
| [BORING-WEBHOOK-011](#boring-webhook-011) | SHOULD | Protect shared state against concurrent deliveries |
| [BORING-WEBHOOK-012](#boring-webhook-012) | SHOULD | Monitor failures and plan for exhausted retries |
| [BORING-WEBHOOK-013](#boring-webhook-013) | CONSIDER | Decide deliberately whether to trust the payload or fetch current state |

## Rules in detail

### BORING-WEBHOOK-001 — Process deliveries idempotently (MUST)

Providers deliver at-least-once. A timeout on your side, a retry on theirs, or a manual
redelivery means the same event can arrive twice — and some providers emit two distinct
event objects for one underlying occurrence. Processing must therefore be safe to
repeat: deduplicate by event/delivery ID *and* guard the business effect, so a repeated
payment event does not create a second order. This mirrors HTTP's own retry rule:
repeating a request is only safe when its effect is idempotent (RFC 9110 §9.2.2).

- **Fails when:** a retried event double-charges, double-sends, or double-inserts; a
  handler that partially succeeded duplicates its completed work on retry.
- **Edge cases:** [BORING-EDGE-WEBHOOK-001](../../edge-cases/webhooks/delivery.yaml)
  (duplicate delivery), [BORING-EDGE-WEBHOOK-004](../../edge-cases/webhooks/delivery.yaml)
  (retry after partial processing).

### BORING-WEBHOOK-002 — Verify sender authenticity and fail closed (MUST)

Your endpoint URL is public. The only thing separating you from anyone on the internet
issuing fake "payment succeeded" events is signature verification: an HMAC over the raw
request body using a shared secret (Stripe signs `timestamp + "." + body` with HMAC-
SHA256 in its `v1` scheme; GitHub provides `X-Hub-Signature-256`). Verify against the
*raw* bytes, compare in constant time, and reject missing/invalid signatures before any
processing.

- **Fails when:** unsigned requests reach business logic; signatures are checked
  against re-serialized JSON; comparison is not timing-safe.
- **Edge cases:** [BORING-EDGE-WEBHOOK-011](../../edge-cases/webhooks/delivery.yaml)
  (replayed, correctly signed old event),
  [BORING-EDGE-WEBHOOK-010](../../edge-cases/webhooks/delivery.yaml) (secret rotation).

### BORING-WEBHOOK-003 — Enforce replay windows when the scheme embeds a timestamp (SHOULD)

A captured delivery keeps its valid signature forever. Schemes like Stripe's embed a
timestamp inside the signed payload precisely so the receiver can reject deliveries
older than a tolerance (Stripe's libraries default to five minutes). Verify the HMAC
*and* the timestamp. And don't set the tolerance to zero — legitimate retries are
delayed by definition.

- **Fails when:** an old, correctly signed delivery is accepted and re-triggers
  processing (replay attack); zero tolerance rejects every legitimate delayed delivery.

### BORING-WEBHOOK-004 — Acknowledge quickly and process asynchronously (SHOULD)

Providers enforce response deadlines — GitHub terminates the connection and counts the
delivery as failed after 10 seconds without a 2xx — and every "failure" becomes a retry.
Acknowledge promptly, push the event onto a queue, and do the real work asynchronously.
Slow synchronous handlers don't just time out: they generate retry storms that multiply
whatever duplicate-processing bugs you also have.

### BORING-WEBHOOK-005 — Treat 2xx as the only success signal and never acknowledge before the delivery is durable (MUST)

A 2xx response is a contract: it tells the provider "delivered, stop retrying" (any 2xx
counts; redirects are failures). If you return 200 and *then* crash before persisting
the event, no retry is coming — the event is gone. Acknowledge only once the delivery
is durably stored (or processed).

- **Edge cases:** [BORING-EDGE-WEBHOOK-006](../../edge-cases/webhooks/delivery.yaml)
  (acknowledge-then-crash loses the event).

### BORING-WEBHOOK-006 — Process events order-independently (MUST)

Delivery order is not generation order. Stripe does not guarantee ordering and
explicitly warns against using the event's `created` time to infer it. A late
`subscription.updated` must not overwrite a newer cancellation, and `payment.succeeded`
must not be applied before `payment.intended`. Guard transitions with state checks,
versions, or a re-fetch of the authoritative object.

- **Edge cases:** [BORING-EDGE-WEBHOOK-002](../../edge-cases/webhooks/delivery.yaml)
  (out-of-order), [BORING-EDGE-WEBHOOK-003](../../edge-cases/webhooks/delivery.yaml)
  (hours-late delivery with stale state).

### BORING-WEBHOOK-007 — Acknowledge unknown event types gracefully (SHOULD)

Providers add event types over time. If your strict deserializer or exhaustive switch
fails on unknown types, provider evolution becomes your outage — complete with retries
and alert noise. Acknowledge unknown types with 2xx (store them for inspection if
useful) and move on.

- **Edge cases:** [BORING-EDGE-WEBHOOK-008](../../edge-cases/webhooks/delivery.yaml)
  (unknown event type).

### BORING-WEBHOOK-008 — Persist deliveries before processing (SHOULD)

Store what you received — with the provider's event and delivery IDs — before or during
processing. This gives you deduplication that survives restarts, an audit trail, and a
recovery path when the provider's retry budget runs out (GitHub's advice after an
outage is to redeliver missed webhooks yourself — which requires knowing what you
missed).

- **Edge cases:** [BORING-EDGE-WEBHOOK-005](../../edge-cases/webhooks/delivery.yaml)
  (downtime exhausts retries), [BORING-EDGE-WEBHOOK-007](../../edge-cases/webhooks/delivery.yaml)
  (concurrent processing of the same entity).

### BORING-WEBHOOK-009 — Treat event payloads as untrusted input (MUST)

A valid signature authenticates the *sender*, not the *correctness* of the payload.
Validate structure, types, and ranges before acting; tolerate unknown fields (RFC 8259
§4 even permits duplicate member names in JSON objects); and when correctness depends
on a value — an amount, a state — validate it or fetch the authoritative version.

- **Edge cases:** [BORING-EDGE-WEBHOOK-009](../../edge-cases/webhooks/delivery.yaml)
  (schema evolution breaks a strict parser).

### BORING-WEBHOOK-010 — Support signing-secret rotation without dropped deliveries (SHOULD)

Rotating a signing secret has a dangerous moment: the sender and receiver must agree
on which secret is live. Providers bridge this by keeping the previous secret valid
during rotation (Stripe keeps it active for up to 24 hours after rolling). Your
verification should accept both secrets during the overlap, or rotation day becomes
dropped-delivery day.

- **Edge cases:** [BORING-EDGE-WEBHOOK-010](../../edge-cases/webhooks/delivery.yaml).

### BORING-WEBHOOK-011 — Protect shared state against concurrent deliveries (SHOULD)

Deliveries can arrive in parallel, and your own queue workers may process them
concurrently. Two workers can both read "unprocessed" for the same event and both
apply it. Serialize per entity, lock per event, or use atomic state transitions.

- **Edge cases:** [BORING-EDGE-WEBHOOK-007](../../edge-cases/webhooks/delivery.yaml).

### BORING-WEBHOOK-012 — Monitor failures and plan for exhausted retries (SHOULD)

Retries are not infinite: Stripe stops after three days and marks the event disabled;
GitHub leaves redelivery to you. Without failure monitoring and a dead-letter path,
missed events disappear silently. Track failures, alert, store dead deliveries, and
know your provider's replay tooling before you need it.

- **Edge cases:** [BORING-EDGE-WEBHOOK-005](../../edge-cases/webhooks/delivery.yaml).

### BORING-WEBHOOK-013 — Decide deliberately whether to trust the payload or fetch current state (CONSIDER)

Both strategies are legitimate. Acting on the payload is fast and API-independent but
requires the ordering guards of BORING-WEBHOOK-006; re-fetching current state is
authoritative but adds latency, cost, and a dependency on the provider's API being up.
The mistake is doing it implicitly and inconsistently — decide per event type and
document the decision.

## Related edge-case datasets

- [Webhook delivery edge cases](../../edge-cases/webhooks/delivery.yaml) — duplicates,
  ordering, delays, partial failures, downtime, schema evolution, rotation, replay.
- Numeric boundaries that affect payloads (amounts, counts) live in
  [numbers/boundaries.yaml](../../edge-cases/numbers/boundaries.yaml).

## Sources

- [Stripe Webhooks](https://docs.stripe.com/webhooks) — delivery semantics, signatures,
  retry behavior, best practices (tier 3).
- [Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests) —
  request-side idempotency patterns (tier 3).
- [GitHub: Best practices for using webhooks](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)
  and [Validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
  (tier 3).
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) — idempotent
  methods (§9.2.2), 2xx semantics (§15.3) (tier 1).
- [RFC 8259: JSON](https://www.rfc-editor.org/rfc/rfc8259) — object member semantics,
  number grammar (tier 1).

Full provenance: [sources/registry.yaml](../../sources/registry.yaml).
