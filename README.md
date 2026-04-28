# Padel Scoreboard

Tiny static scoreboard for a padel season at Aurial Padel Bratislava.

- **Team A:** Tolya & Ruslana
- **Team B:** Yeva & Max

## How it works

Pure static site — `index.html` + `style.css` + `app.js` fetch `matches.json` on load and render the scoreboard. No build step, no framework.

Hosted on Vercel; pushes to `main` auto-deploy.

## Updating scores

Edit `matches.json`:

1. Find the match by `id`.
2. Set `status` to `"completed"` and populate `sets` (each set is `{ "a": <team A games>, "b": <team B games> }`).
3. Update top-level `lastUpdated` to current ISO time.
4. Commit and push:

   ```bash
   git add matches.json
   git commit -m "match N: 6-4, 7-5"
   git push
   ```

Vercel rebuilds in ~30 seconds.

## Local preview

Just open `index.html` in a browser, or run any static server in this folder (e.g. `python3 -m http.server`).
