# Chainforge Commit SOP

Use this standard for commits and branches so Chainforge can link work to tasks and render useful activity.

## Commit Format

```text
<type>(<scope>): <description> [#<task-id>]
```

Allowed types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `ci`, `style`, `revert`, `wip`.

Rules:

- Keep the subject line to 72 characters where practical.
- Use imperative language, for example `add login callback` instead of `added login callback`.
- Include the Chainforge task UUID in `[#<task-id>]` when the commit belongs to a task.
- Explain motivation in the body when the change is not obvious from the subject.

## Branches

Use task branches when work belongs to a Chainforge task:

```text
task/<task-id>/<short-description>
```

Chainforge can use task branches and commit subjects to auto-link pushes, pull requests, and task status changes.

## Examples

```text
feat(api): add OAuth callback handler [#00000000-0000-0000-0000-000000000000]
fix(ui): show repo setup errors
docs: update onboarding notes
```
