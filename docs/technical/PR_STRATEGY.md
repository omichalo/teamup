# Pull request strategy for multi-task refactors

When a refactor spans multiple tightly-coupled tasks (shared store, component factorisation, validation alignment, etc.), group them into **one pull request** rather than opening a PR per task. This keeps review coherent and prevents partial merges from breaking related pages.

## Guidelines
- Start from a single branch dedicated to the refactor.
- Sequence tasks as separate commits for clarity (e.g. store setup, UI factorisation, validations), but keep them in one PR.
- Only split into multiple PRs if tasks are truly independent and can be deployed separately without feature gaps.
- Explicitly call out in the PR description when several plan items are delivered together so reviewers can evaluate the whole scope.
- If automation creates multiple PRs by default, disable/adjust it for this branch so only the combined PR remains.

