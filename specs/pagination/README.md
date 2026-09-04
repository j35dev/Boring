# Pagination

> Status: draft · Updated: 2026-09-04 · [Machine-readable data](spec.yaml)

Pagination looks like plumbing — a `limit` here, a `page` there. What makes it
hard is that pages are separate requests against a moving dataset: rows are
inserted and deleted between fetches, sort values tie, cursors outlive their
queries, and the last page fills exactly to the boundary. Naive paging turns
those ordinary events into duplicated items, skipped items, infinite loops, and
confidently wrong data.

This spec defines what a correct paginated list must do. It is
framework-neutral (REST, GraphQL, or database-backed listing) and deliberately
about everyday correctness — ordering, traversal stability, cursor contracts,
termination, and limits — not access control or threat modeling.

## Scope

**Applies when** your application exposes an ordered list that clients fetch in
pages across multiple requests.

**Does not apply when** the entire result set always returns in one response, or
pagination is purely presentational over a fixed, immutable array.

## Use it like this

Tell your coding agent:

```text
Read the Boring pagination specification (specs/pagination/README.md) and the
linked edge cases. Audit the paginated endpoints in this repository. For each
Boring rule, report satisfied / violated / unverifiable, citing rule IDs.
```

## Quick checklist

In a minute, confirm that every paged list has answers for:

- [BORING-PAGINATION-001](#boring-pagination-001) — a total order with a tiebreaker
- [BORING-PAGINATION-002](#boring-pagination-002) — no duplicates/skips under inserts/deletes
- [BORING-PAGINATION-004](#boring-pagination-004) — cursors bound to their query
- [BORING-PAGINATION-005](#boring-pagination-005) — termination that never trusts item counts
- [BORING-PAGINATION-006](#boring-pagination-006) — enforced page-size bounds

The YAML is the canonical record of every rule's evidence, applicability, failure
modes, and verification scenarios. This page is the deliberately human-shaped guide.

## The rules

| ID | Level | Rule |
|---|---|---|
| [BORING-PAGINATION-001](#boring-pagination-001) | MUST | Order paged results by a stable total order |
| [BORING-PAGINATION-002](#boring-pagination-002) | SHOULD | Keep traversal stable when rows are inserted or deleted between pages |
| [BORING-PAGINATION-003](#boring-pagination-003) | MUST | Treat cursors as opaque, untrusted input |
| [BORING-PAGINATION-004](#boring-pagination-004) | MUST | Bind cursors to the query that produced them |
| [BORING-PAGINATION-005](#boring-pagination-005) | MUST | Terminate correctly on empty and exact-boundary pages |
| [BORING-PAGINATION-006](#boring-pagination-006) | MUST | Enforce documented page-size defaults and maxima server-side |
| [BORING-PAGINATION-007](#boring-pagination-007) | MUST | Keep backward pagination in the same order |
| [BORING-PAGINATION-008](#boring-pagination-008) | CONSIDER | Decide the totals and random-access policy deliberately |
| [BORING-PAGINATION-009](#boring-pagination-009) | CONSIDER | Define cursor lifetime and invalidation |

## Rules in detail

### BORING-PAGINATION-001 — Order paged results by a stable total order (MUST)

Page boundaries cut through whatever order the database happened to use. Without
an explicit sort that uniquely identifies each row, identical requests return
different pages — and paging by a business key alone (`created_at`, `priority`)
leaves every tie to chance. Add the unique tiebreaker (usually the primary key,
in the same direction) so positions are stable.

- **Fails when:** paging by timestamp while hundreds of rows share one second;
  no `ORDER BY` at all; tiebreaker sorted opposite to the business key.
- **Edge cases:** [BORING-EDGE-PAGINATION-001](../../edge-cases/pagination/traversal.yaml)
  (no stable order), [BORING-EDGE-PAGINATION-002](../../edge-cases/pagination/traversal.yaml)
  (tied values).

### BORING-PAGINATION-002 — Keep traversal stable when rows are inserted or deleted between pages (SHOULD)

Offsets name a position ("skip 20"), so inserts and deletes ahead of the window
shift every later page into duplicates and skips. Position-anchored continuations
("after this key") name a place in the sort order and survive those shifts. That
is the strong default for feeds, timelines, and large changing tables. Plain
offset paging is still fine for small, effectively static lists and for genuine
random access — document the tradeoff instead of pretending offsets are stable.

- **Fails when:** head inserts duplicate boundary rows onto the next offset page;
  early deletes silently skip the rows that slid forward.
- **Edge cases:** [BORING-EDGE-PAGINATION-003](../../edge-cases/pagination/traversal.yaml)
  (inserts), [BORING-EDGE-PAGINATION-004](../../edge-cases/pagination/traversal.yaml)
  (deletes), [BORING-EDGE-PAGINATION-010](../../edge-cases/pagination/traversal.yaml)
  (anchor moves).

### BORING-PAGINATION-003 — Treat cursors as opaque, untrusted input (MUST)

Cursors arrive from the network. Truncated, hand-edited, replayed, expired, and
cross-endpoint cursors are normal traffic. Validate on receipt and fail safely —
clear error or documented restart policy — and never require clients to parse
cursor internals to traverse the list.

- **Fails when:** a truncated cursor returns a stack trace; a foreign cursor
  returns another scope's rows; clients build cursors by hand.
- **Edge cases:** [BORING-EDGE-PAGINATION-005](../../edge-cases/pagination/traversal.yaml).

### BORING-PAGINATION-004 — Bind cursors to the query that produced them (MUST)

A cursor is a position inside one ordered, filtered, scoped set. Replayed against
different filters, a different sort, or a different authorization scope, the same
bytes mean something else. Reject the mismatch or re-scope it explicitly — never
return the wrong slice silently.

- **Fails when:** an "open" cursor paged against "closed" returns open rows;
  a mid-traversal sort change scrambles the sequence without error.
- **Edge cases:** [BORING-EDGE-PAGINATION-006](../../edge-cases/pagination/traversal.yaml).

### BORING-PAGINATION-005 — Terminate correctly on empty and exact-boundary pages (MUST)

Only the explicit continuation state ends a traversal: absent token,
`has_more`/`hasNextPage` false. Filtered pages can return zero items while more
data remains, and a full final page is indistinguishable from a full non-final
page by count. Empty sets are valid data with correct page info, not errors.

- **Fails when:** an empty filtered page truncates traversal; an exactly-full
  final page loops clients into one fruitless extra request.
- **Edge cases:** [BORING-EDGE-PAGINATION-007](../../edge-cases/pagination/traversal.yaml).

### BORING-PAGINATION-006 — Enforce documented page-size defaults and maxima server-side (MUST)

Every paginated endpoint defines a default and a maximum page size and enforces
them regardless of client input. Zero, negative, non-numeric, and excessive
sizes are clamped or rejected per documented policy. The numbers themselves are
your decision ([decision_required](../../docs/methodology.md)); enforcement is not.

- **Fails when:** `limit=1000000` materializes a table; `limit=0` dumps everything;
  silent server-side reduction contradicts the navigation links.
- **Edge cases:** [BORING-EDGE-PAGINATION-008](../../edge-cases/pagination/traversal.yaml).

### BORING-PAGINATION-007 — Keep backward pagination in the same order (MUST)

Wherever backward traversal (`before`/`last`, `ending_before`) is offered, pages
keep the list's business order — the direction changes which side of the cursor
is addressed, never the row order. Forward-then-backward must return to the same
items with coherent `hasPreviousPage`/`startCursor` semantics.

- **Fails when:** backward pages arrive reversed relative to forward pages;
  `hasPreviousPage` traps clients in a backward loop on the first page.
- **Edge cases:** [BORING-EDGE-PAGINATION-009](../../edge-cases/pagination/traversal.yaml).

### BORING-PAGINATION-008 — Decide the totals and random-access policy deliberately (CONSIDER)

Exact totals over large or changing datasets are expensive and stale the moment
they are computed; cursor traversal cannot address "page 47" at all. Decide and
document whether the API offers exact totals, approximate counts with
disclaimers, or no totals — and whether page numbers exist and by what mechanism.
This rule is [decision_required](../../docs/methodology.md): the documented
choice is the requirement.

### BORING-PAGINATION-009 — Define cursor lifetime and invalidation (CONSIDER)

Cursors promise future reads against state that may not survive: retention
purges, sort-key updates, encoding or schema changes, key rotation. Eternal and
expiring cursors are both legitimate. Define the lifetime, the invalidation
events, and the expired-cursor behavior — and what happens when an anchor row
moves or vanishes mid-traversal. This rule is
[decision_required](../../docs/methodology.md).

- **Edge cases:** [BORING-EDGE-PAGINATION-010](../../edge-cases/pagination/traversal.yaml)
  (anchor moves), [BORING-EDGE-PAGINATION-005](../../edge-cases/pagination/traversal.yaml)
  (expired cursor).

## Related edge-case datasets

- [Pagination traversal](../../edge-cases/pagination/traversal.yaml) — ordering,
  ties, inserts/deletes between pages, cursor validity and rebinding, boundary
  pages, page-size abuse, reverse traversal, concurrent anchor changes.

## Verification and evidence

Each rule in [spec.yaml](spec.yaml) carries a machine-readable verification block with
`automatable`, `visibility`, and `given / when / expect` scenarios. Its `evidence`
entries identify the source, a locator, and whether Boring is reporting direct,
derived, or contextual support. Start with the linked scenario IDs, then read the
source registry before treating a product-specific decision as a universal rule.

## Status

This is a reference-quality spec for the repository alongside Password Reset. It is
still `draft`: new specs should generally match its evidence, scope, failure-mode,
edge-case, and verification structure before they are considered ready for review.

## Sources

- [PostgreSQL: LIMIT and OFFSET](https://www.postgresql.org/docs/current/queries-limit.html)
  — unique ordering requirement, offset inconsistency and cost (tier 3).
- [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
  — opaque cursors, first/after and last/before, edge order, PageInfo (tier 1).
- [Stripe API pagination](https://docs.stripe.com/api/pagination) — cursor parameters,
  limits, `has_more` list responses (tier 3).
- [GitHub REST API pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api)
  — page/cursor parameters, Link relations, per_page bounds (tier 3).
- [DynamoDB: paginating query results](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html)
  — LastEvaluatedKey/ExclusiveStartKey keyset semantics (tier 3).

Full provenance: [sources/registry.yaml](../../sources/registry.yaml).
