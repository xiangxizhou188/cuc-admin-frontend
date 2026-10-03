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
