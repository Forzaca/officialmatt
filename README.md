# Matt's Portfolio

Static multi-page site (plain HTML/CSS/JS in `public/`) + Vercel functions (`api/`) + Vercel Blob storage.
No framework, no build step.

```
public/            every page is its own index.html
  index.html       home (hero, services, featured work, reviews, contact)
  work/ about/ reviews/ queue/ status/ terms/ privacy/
  maintenance/     shown to visitors while maintenance mode is on
  admin/           admin panel, only for ADMIN_DISCORD_ID
  404.html         served by Vercel for unknown paths
  css/ js/ assets/
api/
  auth.js          /api/auth/login | callback | logout | me   (Discord OAuth, `identify` scope)
  site.js          public data + anonymous page-view tracking
  reviews.js       submit / withdraw reviews (Discord sign-in required)
  admin.js         everything the admin panel does (server-side admin check on every call)
  health.js        /status checks + uptime history (daily Vercel cron)
lib/               shared server code (sessions, Blob JSON store, data shapes)
```

## Deploy

1. **Discord app**: https://discord.com/developers/applications → New Application → OAuth2.
   Copy the Client ID + Secret and add the redirect `https://YOUR-DOMAIN/api/auth/callback`.
   No bot is needed, and users don't have to be in any server.
2. **Vercel**: import this folder as a project (Framework preset: *Other*).
3. **Blob**: Project → Storage → Create → Blob → connect it. That sets `BLOB_READ_WRITE_TOKEN`.
4. **Env vars**: add everything from `.env.example` in Project → Settings → Environment Variables.
5. Deploy, go to `/admin`, sign in with Discord, and upload your work.

## Things to know

- **Lanyard** powers the contact card. Your Discord account has to be in the Lanyard server
  (discord.gg/lanyard) for it to work. Without it, the card falls back to your logo.
- **Maintenance mode** redirects visitors in the browser. Status, terms and privacy stay open,
  and you (the admin) can still browse everything.
- **Social previews**: `og:image` is a relative path. Some apps (Discord included) need an absolute URL,
  so once you have a domain, replace `/assets/og.jpg` with `https://YOUR-DOMAIN/assets/og.jpg` in the page heads.
- **Blob usage**: every counted page view writes one small JSON file (a Blob "advanced operation").
  Views are counted once per page per browser session. Watch Storage → Blob usage if traffic grows.
- **Edits after an admin change** can take up to ~60 s to show for every visitor (Blob CDN cache).
- **Toolkit list** on `/about` is a guess. Edit `public/about/index.html` to match what you actually use.
