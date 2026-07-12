# Issue tracker: GitHub

Issues and specs for this repository live as GitHub issues in `ZaddyAman/knowledge-base-agency`. Use the `gh` CLI for operations.

## Conventions

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open --json number,title,body,labels,comments`
- Comment: `gh issue comment <number> --body "..."`
- Label: `gh issue edit <number> --add-label "..."`
- Close: `gh issue close <number> --comment "..."`

Infer the repository from `git remote -v`; `gh` does this automatically inside the clone.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Publishing and fetching

- When a skill says “publish to the issue tracker,” create a GitHub issue.
- When a skill says “fetch the relevant ticket,” run `gh issue view <number> --comments`.

## Wayfinding operations

- Map: one issue labelled `wayfinder:map`.
- Child ticket: use a GitHub sub-issue when available. Otherwise place `Part of #<map>` in the child body and maintain the map task list.
- Blocking: use GitHub issue dependencies when available. Otherwise place `Blocked by: #<n>` at the top of the issue body.
- Frontier: the first open, unassigned child whose blockers are all closed.
- Claim: `gh issue edit <n> --add-assignee @me` before work.
- Resolve: comment with the decision, close the issue, then add a one-line linked gist under the map’s Decisions-so-far section.
