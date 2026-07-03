# mamaguebo

Single-image site on Cloudflare Workers + R2.

| URL | Purpose |
|-----|---------|
| `mamaguebo.com` | Public page |
| `mamaguebo.com/admin` | Upload UI (protect with Zero Trust) |
| `cdn.mamaguebo.com/image.webp` | Image CDN (R2) |

## Deploy

```bash
cd worker
npm install
npx wrangler login   # first time
npm run deploy
```

Site and admin changes both go live with `npm run deploy`. No GitHub Pages needed.

See `worker/SETUP.md` for R2, DNS, and Zero Trust setup.

## Disable GitHub Pages

1. GitHub repo → **Settings** → **Pages** → set source to **None**
2. Remove the custom domain `mamaguebo.com` from GitHub Pages if still listed

The Worker route `mamaguebo.com/*` serves the whole site through Cloudflare.
