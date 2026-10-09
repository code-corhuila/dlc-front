# DI LUCCA — dlc-front (Claude Code)

@AGENTS.md

## Claude Code specifics

- Skills in `.claude/skills`: `front-increment` for every increment, `front-architecture` before
  touching `src/` or `deploy/`, `tdd-evidence` before production code, `quality-gates` before
  committing.
- Permissions in `.claude/settings.json`; never work around a denied command.
- Start of a new session: read `AGENTS.md`, `docs/spec/dlc-front-spec.md`, the latest section of
  `docs/quality/validation-evidence.md` and `git log --oneline -10` before acting.
