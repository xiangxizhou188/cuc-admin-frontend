# CUC Supply HVAC Admin

Independent frontend for product, inventory, media, and storefront content
operations.

## Development

```bash
npm install
npm run dev
```

The current phase uses seeded browser-local data. Authentication, database
storage, object storage, and audit APIs will be connected in the backend phase.

## Cloudflare Pages

```bash
npm run build:pages
npm run deploy:pages
```

The Pages build is a static React application in `pages-dist/`. It reuses the
same admin component as the Vinext build and does not include server-side APIs.
Production is deployed at <https://admin.cucsupply.com>. The original
<https://neotrix-hvac-admin.pages.dev> address remains available as a fallback.


## Canonical workspace

Use `/Users/xizhouxiang/Documents/HVAC PARTS` as the only local workspace.
The `client`, `admin`, and `backend` directories are independent Git repositories;
work on `main` in each and push to its GitHub `origin`.
Shared source helpers live in each repository’s `shared/` directory. When changing
a shared helper, apply the same update to the other two copies and run their checks.
Do not create additional Git worktrees for routine development.
