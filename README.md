# image-sites

Multi-domain single-image sites on Cloudflare Workers + R2.

| Site | Public | Admin | CDN |
|------|--------|-------|-----|
| mamaguebo.com | `/` | `/admin` | `cdn.mamaguebo.com/image.webp` |
| malditomarico.com | `/` | `/admin` | `cdn.malditomarico.com/image.webp` |

## Deploy

```bash
cd worker
npm run deploy                  # mamaguebo
npm run deploy:malditomarico    # malditomarico
npm run deploy:all              # both
```

See `worker/SETUP.md` for R2, DNS, and Zero Trust setup.
