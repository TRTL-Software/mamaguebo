# Mamaguebo admin worker

Uploads replace a single image in R2. The public site always loads:

`https://cdn.mamaguebo.com/image.webp`

## Architecture

- **mamaguebo.com** — GitHub Pages (static, fixed CDN URL in `index.html`)
- **cdn.mamaguebo.com** — R2 custom domain (serves the image)
- **admin.mamaguebo.com** — this Worker (upload UI + API)
- **Cloudflare Zero Trust** — protects `admin.mamaguebo.com`

## 1. Create the R2 bucket

1. Cloudflare dashboard → **R2** → **Create bucket**
2. Name: `mamaguebo-images` (must match `wrangler.jsonc`)
3. Open the bucket → **Settings** → **Custom Domains** → add `cdn.mamaguebo.com`
4. Cloudflare adds the DNS record automatically

## 2. Seed the first image (optional)

From the repo root:

```bash
npx wrangler r2 object put mamaguebo-images/image.webp \
  --file=assets/IMG_1959.webp \
  --content-type=image/webp \
  --remote
```

Or upload via the admin UI after deploy.

## 3. Deploy the Worker

```bash
cd worker
npm install
npx wrangler login
npm run deploy
```

Add the custom domain:

1. **Workers & Pages** → **mamaguebo-admin** → **Settings** → **Domains & Routes**
2. Add **Custom Domain**: `admin.mamaguebo.com`

## 4. Cache purge secret (recommended)

So the CDN shows the new image immediately after upload:

1. Cloudflare → your profile → **API Tokens** → create token with **Zone → Cache Purge**
2. Copy your zone ID from **mamaguebo.com** → **Overview** (right sidebar) into `CF_ZONE_ID` in `wrangler.jsonc`

```bash
cd worker
npx wrangler secret put CF_API_TOKEN
# paste the token

npm run deploy
```

Cache purge is optional — without it, updates may take a few minutes due to CDN caching.

## 5. Cloudflare Zero Trust

1. **Zero Trust** → **Access** → **Applications** → **Add an application**
2. Type: **Self-hosted**
3. Application domain: `admin.mamaguebo.com`
4. Policy: allow your email (or Google/GitHub login)
5. Save

Only you can reach the admin upload page.

## 6. Push the site change

Commit and push the updated `index.html` so GitHub Pages uses the CDN URL.

## Local dev

```bash
cd worker
npm run dev
```

Visit `http://localhost:8787/admin`. Local dev uses a simulated R2 bucket unless you pass `--remote`.

## Changing the CDN URL

Edit `PUBLIC_IMAGE_URL` and `IMAGE_KEY` in `wrangler.jsonc`, then update `index.html` to match.
