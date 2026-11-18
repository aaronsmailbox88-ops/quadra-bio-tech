# Quadra Bio Tech — the app

Live app: https://aaronsmailbox88-ops.github.io/quadra-bio-tech/ (sign in, then it installs to a phone home screen from the browser's Share / Add to Home Screen).

Everything the app is made of lives in **`src/`**. The files at the repo root (`app.html`, `index.html`, `sw.js`, `manifest.webmanifest`, icons, `VERSION`) are **built** from `src/` — do not edit those by hand; edit `src/` and they are regenerated.

## How to edit the app

**On github.com (no tools needed).** Open a file under `src/`, click the pencil (Edit), change the text, click **Commit changes**. A build runs automatically (Actions tab) and the live app updates in about two minutes. Reopen the app on your phone to see it (swipe it away and open again if it looks old).

**With Claude.** In any Claude chat with this repository attached, describe the change; Claude edits `src/` and pushes.

**On a computer.** `git clone`, edit, then `python3 src/build.py --site .` (plain Python 3, no packages) and open `src/index.html` for a quick look, or commit and push and let the Action build.

**Shop products, store name, Amazon tag** are *not* in the code: sign in to the app as an admin, open **Shop** and switch on **Edit shop**.

## Where things are

| What you want to change | File |
|---|---|
| Colours, fonts, spacing, the glowing backdrop | `src/part_style.html` (all colours are the variables at the top), `src/part_extra.css`, `src/bg/hex.py` (regenerates `bg/hex.svg`) |
| The "NO COA, NO DOSE" dialog, the first-run walkthrough pages, the COA tour | `src/part_walk.js` (`PAGES`, `notice()`, `COA_STEPS`) |
| The COA Checker (the six checks, wording, verdict) | `src/part_coa.js` |
| Peptide content — overview, trial results, side effects, status, dosing data | `src/packs/<peptide>.json` (one file per peptide; `build.py` validates them) |
| How a peptide page is laid out, tabs, routing between sections | `src/app.js` |
| Learn pages (education text) | `src/part_learn.html`; the weighing protocol, supplies list, storage and titration text in `src/part_protocol.js` |
| Track → Vitals | `src/part_track.html`, `src/part_tracker.js` |
| Track → Levels (blood-level model) | `src/part_levels.html`, `src/part_levels.js`, `src/sim2.js` |
| Vial tracker and the Mix-a-vial wizard | `src/part_vials.html`, `src/part_vials.css`, `src/part_vials.js` |
| Syringe animation | `src/part_syringe.js` |
| Shop page behaviour | `src/part_shop.html`, `src/part_shop.js` |
| Sign-in gate and account sync (Supabase) | `src/part_auth.js` |
| Bottom tabs | `src/part_nav.html` |
| App icon, home-screen name | `src/part_icons.html`, `src/brand/` |
| Version number shown in the footer | `APP_VER` at the top of `src/build.py` |

## Accounts and data

Sign-in and per-user data are Supabase (project RED VAN). Shared data (the Shop catalogue) is the table `qb_shared_docs`; who may edit it is the table `qb_admins` (an email per row).

Roll back: GitHub → Commits → pick the last good one → Revert, or ask Claude to revert.
