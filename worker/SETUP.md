# Image site workers

One codebase, multiple domains via Wrangler environments. Each site has its own Worker, R2 bucket, and CDN URL.

| Site | Worker | R2 bucket | CDN |
|------|--------|-----------|-----|
| mamaguebo.com | `mamaguebo` | `mamaguebo-images` | `cdn.mamaguebo.com/image.webp` |
| malditomarico.com | `malditomarico` | `malditomarico-images` | `cdn.malditomarico.com/image.webp` |

## Deploy

```bash
cd worker
npm install
npx wrangler login   # first time

npm run deploy                  # mamaguebo only
npm run deploy:malditomarico    # malditomarico only
npm run deploy:all              # both
```

## Per-site setup checklist

Repeat for each domain (replace names accordingly):

1. **R2 bucket** — create in Cloudflare (or `npx wrangler r2 bucket create BUCKET_NAME`)
2. **CDN DNS** — CNAME `cdn` → `yourdomain.com` (proxied), or R2 custom domain
3. **Seed image** — `npx wrangler r2 object put BUCKET/image.webp --file=... --remote`
4. **Deploy worker** — `npm run deploy` or `npm run deploy:malditomarico`
5. **Zero Trust** — protect `yourdomain.com/admin`
6. **Cache purge (optional)** — set `CF_ZONE_ID` in `wrangler.jsonc`, then `npx wrangler secret put CF_API_TOKEN` (add `--env malditomarico` for the second site)

## malditomarico.com first-time setup

```bash
cd worker

npx wrangler r2 bucket create malditomarico-images

# optional: seed first image
npx wrangler r2 object put malditomarico-images/image.webp \
  --file=../assets/IMG_1959.webp \
  --content-type=image/webp \
  --remote

npm run deploy:malditomarico
```

DNS in Cloudflare for **malditomarico.com**:

- `malditomarico.com` — on Cloudflare (proxied)
- `cdn` CNAME → `malditomarico.com` (proxied)

Secrets for malditomarico use the `--env` flag:

```bash
npx wrangler secret put CF_API_TOKEN --env malditomarico
```

## Local dev

```bash
npm run dev                    # mamaguebo config
npm run dev:malditomarico      # malditomarico config
```

## Adding another site later

Copy the `malditomarico` block in `wrangler.jsonc` → `env`, change domain/bucket names, add a `deploy:newsite` script.
