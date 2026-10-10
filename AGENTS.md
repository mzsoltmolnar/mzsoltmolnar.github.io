# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, etc.) working with code in this repository.

## Overview

Zsolt Molnár's portfolio site (brand "zsomoTech"). It's a single static page, `index.html`, built on the Start Bootstrap **Agency v6.0.2** template (Bootstrap 4.5 + jQuery 3.5). There is no package manager, build step, linter, or test suite. Files are served exactly as committed.

## Run locally

From the repo root:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/. Serve the repo root itself, not a parent folder, because `js/linkModal.js` writes root-absolute URLs (`/#projectPathfinder`) to the address bar.

## Deployment

- **Branches:** GitHub Pages publishes the **`prod`** branch. `master` is the default branch. Nothing is live until it's on `prod`, so don't push to `prod` unless asked.
- **Custom domain:** `CNAME` holds `zsomotech.com`, and `mzsoltmolnar.github.io` redirects there. The repo's Pages settings commit to this file, so don't edit or delete it unless asked.
- **Jekyll:** Pages runs its default Jekyll build because there's no `.nojekyll`. Every committed file is served publicly (`/README.md`, for example). Paths starting with `_` or `.` are not published.

## How the page is wired

Nav targets in page order: `#page-top` (the `<body>`/masthead), `#about`, `#projects`, `#research`, `#contactme`. All modals sit in one block after the footer.

**A project/research entry spans four places.** Copy an existing entry and keep the ids in sync:

1. **Card** in the `#projects` or `#research` grid in `index.html`: `<a class="portfolio-link" data-toggle="modal" href="#<modalId>">` plus `assets/img/{projects,research}/thumbnail_*.jpg`.
2. **Modal** `<div class="portfolio-modal modal fade" id="<modalId>">` in the modals block. Detail images are named `desc_*`. A video goes in an empty `<div id="player<Name>">` inside `.embed-responsive`.
3. **`js/youtubeApi.js`**: in `onYouTubeIframeAPIReady`, create `new YT.Player("player<Name>", …)` with the video id. Pause it on that modal's `hide.bs.modal`. One modal can hold several players.
4. **`js/linkModal.js`** (shareable deep links): the slug ↔ modal-id pairing is written **twice**.
   - The `if/else` chain opens a modal from the URL hash on load.
   - The `show.bs.modal` handlers write `/#<slug>` to the URL.

   `hide.bs.modal` resets the hash to `#projects`/`#research`. Slugs often differ from modal ids (`projectPathfinder` → `#project3DPath`). They're public links, so don't rename existing ones.

Within each grid, thumbnails share one aspect ratio so the cards line up: projects use 4:3 (482×362) and research uses 626×393. `.flex-container-item`/`.fill-height-item` make the cards equal height.

**A new section** needs three additions besides the section itself:

- **Nav link** with the `js-scroll-trigger` class. `js/scripts.js` is the stock template script: it handles smooth scrolling, scrollspy, and navbar shrinking, and it cancels the browser's default jump.
- **URL handler:** a matching `replaceState` click handler at the bottom of `linkModal.js`. Without it, the URL hash won't update.
- **Card styles:** if the section has a card grid, add its id to the `#projects .portfolio-item, #research .portfolio-item` selectors in `css/styles.css`.

## Styling

- **`css/styles.css`** is the template's compiled CSS with Bootstrap 4.5.0 inlined (~9.7k lines). There's no SCSS source, so edit it directly. Site-specific rules are in the `/* Own styles - ADDED */` block near the top.
- **Palette:** the template's yellow accent was replaced in place, further down the file, with cyan/teal:
  - `#2df1ff`: hover/active states, branding
  - `#2cceda`
  - `#14676d`: primary buttons
  - `#2197a0`: links

  Unedited rules still use the template yellow `#fed136`, including plain `a`. Inline text links therefore use the `.simple-link` class.
- **Branding assets:**
  - `assets/img/navbar-logo.png`: sized by `#mainNav .navbar-brand img`. It's 3rem tall, or 2.5rem below 992px and once the navbar shrinks.
  - `assets/img/favicon.ico`: the favicon.
  - `assets/img/header-bg.jpg`: the masthead background, set in `header.masthead`.
  - `.branding`: the class for the "zsomoTech" wordmark (Orbitron font).
- **Loading spinner:** its CSS is an inline `<style>` in `index.html` between `</head>` and `<body>`. A script at the end of `<body>` fades it out.

## Dependencies

- **CDN:** jQuery 3.5.1, the Bootstrap 4.5.0 bundle, and jQuery Easing load at the end of `index.html`. Google Fonts load in `<head>`.
- **Bootstrap version:** write Bootstrap **4** markup (`data-toggle`/`data-dismiss`, `ml-*`/`mr-*`, `embed-responsive`), not Bootstrap 5 (`data-bs-*`, `ms-*`/`me-*`).
- **Self-hosted icons:**
  - Font Awesome Free 5.15.1 (`css/all.min.css` + `webfonts/`). Only the solid (`fas`) and brands (`fab`) font files ship, so `far` icons won't render.
  - Academicons (`css/academicons.min.css` + `fonts/`).
- **Analytics:** the analytics tag in `<head>` is Universal Analytics (`UA-163922640-2`). Google stopped processing UA data in 2023, so it records nothing.
