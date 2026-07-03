export interface Env {
  IMAGES: R2Bucket;
  SITE_NAME: string;
  PUBLIC_IMAGE_URL: string;
  IMAGE_KEY: string;
  CF_ZONE_ID?: string;
  CF_API_TOKEN?: string;
}

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "GET" && pathname === `/${env.IMAGE_KEY}`) {
      return serveImage(env);
    }

    if (request.method === "GET" && (pathname === "/" || pathname === "")) {
      return htmlResponse(publicPage(env.SITE_NAME, env.PUBLIC_IMAGE_URL));
    }

    if (
      request.method === "GET" &&
      (pathname === "/admin" || pathname === "/admin/")
    ) {
      return htmlResponse(adminPage(env.PUBLIC_IMAGE_URL));
    }

    if (request.method === "POST" && pathname === "/admin/upload") {
      return handleUpload(request, env);
    }

    return new Response("Not found", { status: 404 });
  },
};

async function serveImage(env: Env): Promise<Response> {
  const object = await env.IMAGES.get(env.IMAGE_KEY);
  if (!object) {
    return new Response("Image not found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": object.httpMetadata?.cacheControl ?? "public, max-age=300",
    },
  });
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const file = form.get("image");

  if (!(file instanceof File) || file.size === 0) {
    return jsonResponse({ ok: false, error: "Choose an image file." }, 400);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonResponse(
      { ok: false, error: "Use JPEG, PNG, WebP, or GIF." },
      400,
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return jsonResponse({ ok: false, error: "Max file size is 10 MB." }, 400);
  }

  await env.IMAGES.put(env.IMAGE_KEY, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=300",
    },
  });

  await purgeCdnCache(env);

  return jsonResponse({
    ok: true,
    url: env.PUBLIC_IMAGE_URL,
  });
}

async function purgeCdnCache(env: Env): Promise<void> {
  if (!env.CF_ZONE_ID || !env.CF_API_TOKEN) {
    return;
  }

  await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: [env.PUBLIC_IMAGE_URL] }),
    },
  );
}

function publicPage(siteName: string, imageUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #111;
    }
    img {
      max-width: 90vw;
      max-height: 90vh;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <img src="${imageUrl}" alt="">
</body>
</html>`;
}

function adminPage(imageUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      background: #111;
      color: #eee;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    main {
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    h1 { font-size: 1.25rem; font-weight: 600; }
    p { color: #999; font-size: 0.9rem; line-height: 1.5; }
    label {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 0.9rem;
    }
    input[type="file"] {
      padding: 12px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      color: #eee;
    }
    button {
      padding: 12px 16px;
      background: #fff;
      color: #111;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    #preview {
      max-width: 100%;
      max-height: 240px;
      object-fit: contain;
      border-radius: 8px;
      background: #1a1a1a;
    }
    #status { font-size: 0.9rem; min-height: 1.25rem; }
    #status.error { color: #f87171; }
    #status.success { color: #4ade80; }
    .current { font-size: 0.8rem; color: #666; word-break: break-all; }
  </style>
</head>
<body>
  <main>
    <h1>Update image</h1>
    <p>Upload replaces the image at the public CDN URL. The main site always uses the same link.</p>
    <p class="current">${imageUrl}</p>
    <img id="preview" src="${imageUrl}?t=${Date.now()}" alt="Current image">
    <form id="form">
      <label>
        New image
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" required>
      </label>
      <button type="submit" id="submit">Upload</button>
    </form>
    <p id="status"></p>
  </main>
  <script>
    const form = document.getElementById("form");
    const status = document.getElementById("status");
    const submit = document.getElementById("submit");
    const preview = document.getElementById("preview");
    const input = form.querySelector('input[type="file"]');

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      preview.src = URL.createObjectURL(file);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.textContent = "Uploading…";
      status.className = "";
      submit.disabled = true;

      try {
        const res = await fetch("/admin/upload", { method: "POST", body: new FormData(form) });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Upload failed");
        status.textContent = "Uploaded. Live site will update shortly.";
        status.className = "success";
        preview.src = data.url + "?t=" + Date.now();
        form.reset();
      } catch (err) {
        status.textContent = err.message || "Upload failed";
        status.className = "error";
      } finally {
        submit.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}
