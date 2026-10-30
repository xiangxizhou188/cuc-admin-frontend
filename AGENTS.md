# Production release workflow

The user authorizes production deployment after future requested changes are implemented and verified. Do not ask for repeated release confirmation. A later user instruction to keep work local or defer release overrides this authorization.

1. Inspect the diff and identify affected services. Preserve unrelated working tree changes.
2. Run `git diff --check` and the smallest meaningful build/check for the change. Reuse checks already completed for the same source revision.
3. Deploy affected services only:
   - Storefront: from `client`, `npm run release:production` (build and Wrangler deploy). If this exact source is already built and verified, use `npx wrangler deploy`.
   - API: from `backend`, run relevant tests/typecheck, inspect remote D1 migrations when database changes are involved, then `npx wrangler deploy`.
   - Admin: from `admin`, `npm run build:pages`, then `npx wrangler pages deploy pages-dist --project-name=neotrix-hvac-admin --branch=main --commit-dirty=true`.
4. Verify the changed production behavior. For UI changes, use the browser and capture the result; for API changes, check health and the affected endpoint.
5. Report the release result concisely. Do not claim unverified behavior. Stop on failed checks or deployment and report the concrete blocker.

Keep changes surgical and avoid repeated optional tests, unrelated deployments, and verbose release narration. This authorization does not authorize destructive data operations or unrelated security changes.

# Branch workflow

Use `main` for future work. Do not create new branches. Preserve existing uncommitted work when consolidating worktrees; do not delete existing branches or worktrees as part of routine edits.
