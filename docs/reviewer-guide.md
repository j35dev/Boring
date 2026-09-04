# Reviewer guide

Review Boring as a hostile standards editor. Your job is to disprove a claim before
accepting it.

For each rule or edge case:

1. Locate and read every cited source section.
2. Decide whether the source is `direct`, `derived`, or `contextual` evidence.
3. Challenge the level: does the source justify MUST/SHOULD, or only a consideration?
4. Test the scope with a legitimate counterexample and inspect both applicability fields.
5. Split bundled behaviors, remove unsourced thresholds, and check for vendor leakage.
6. Follow every edge-case and rule reference; check for duplicates and contradictions.
7. Confirm the given/when/expect scenario would distinguish pass, fail, and unknown.

The desired outcome is not the largest corpus. It is an ID a developer can cite in a
review without overstating what the evidence says.
