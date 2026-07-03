# Mamaguebo

Everything runs on Cloudflare Workers + R2.

| URL | What |
|-----|------|
| `mamaguebo.com` | Public page (Worker) |
| `mamaguebo.com/admin` | Upload UI (Worker, protect with Zero Trust) |
| `cdn.mamaguebo.com/image.webp` | Image file (R2) |

## Deploy

```bash
cd worker
npm install
npx wrangler login
npm run deploy
```

## 1. R2 bucket

1. **R2** → bucket `mamaguebo-images`
2. **Settings** → **Custom Domains** → `cdn.mamaguebo.com`

Seed an image:

```bash
cd worker
npx wrangler r2 object put mamaguebo-images/image.webp \
  --file=../assets/IMG_1959.webp \
  --content-type=image/webp \
  --remote
```

## 2. CDN subdomain (`cdn.mamaguebo.com`)

The image file exists in R2, but the CDN hostname needs DNS.

**Option A — DNS + Worker (quick)**

1. Cloudflare → **DNS** → **Add record**
2. Type: **CNAME**, Name: `cdn`, Target: `mamaguebo.com`, Proxy: **on** (orange cloud)
3. Deploy the worker (serves `/image.webp` from R2 on the cdn subdomain)

**Option B — R2 custom domain (best for delivery)**

```bash
cd worker
npx wrangler r2 bucket domain add mamaguebo-images \
  --domain cdn.mamaguebo.com \
  --zone-id YOUR_ZONE_ID \
  --force
```

Zone ID: Cloudflare → **mamaguebo.com** → **Overview** → right sidebar.

R2 custom domain creates DNS automatically. If you use Option B, remove the Worker `cdn.mamaguebo.com` route to avoid conflicts.

## 3. DNS for the main site

`mamaguebo.com` must be on Cloudflare (orange cloud). The Worker route handles all paths — no GitHub Pages origin needed.

## 3. Cache purge (optional)

Put your zone ID in `CF_ZONE_ID` in `wrangler.jsonc`, then:

```bash
npx wrangler secret put CF_API_TOKEN
npm run deploy
```

## 4. Zero Trust

**Access** → **Applications** → **Self-hosted**

- Domain: `mamaguebo.com`
- Path: `/admin`

## 5. Turn off GitHub Pages

Repo → **Settings** → **Pages** → source **None**. Remove `mamaguebo.com` from GitHub custom domain if set.

## Local dev

```bash
cd worker
npm run dev
```

- `http://localhost:8787/` — public page
- `http://localhost:8787/admin` — admin
