# Getting Up To Speed

A static site (no build step) published with GitHub Pages from the repo root.
`index.html` + `assets/` render three tabs from JSON in `data/`. To change content, edit the JSON only.

The site must stay non-indexable: keep the `robots` meta tags in `index.html` and `robots.txt`.

## Data files

- `data/glossary.json` → `terms[]`: `term`, `date` (YYYY-MM-DD, when the term entered use; the page sorts newest first), `cat` (reuse an existing category where possible), `def`, `why`, `url`. Bump `updated`.
- `data/digests.json` → `issues[]`, one per day: `date`, `title`, `intro`, `tldr[]` (3-4 bullets), `items[]` (`headline`, `summary`, `try`, `source`, `url`, `tags[]`), `quickHits[]` (`text`, `url`), `newTerms[]` (exact `term` names added to the glossary that day).
- `data/showcase.json` → `posts[]`: `id` (unique slug), `date` (day added), `title`, `creator`, `model`, `lab` (`Anthropic`, `OpenAI`, `Google`, `Open source`, or another lab name), `emoji`, `blurb`, `source`, `url`, `tags[]`. Bump `updated`.

All `url` values must be `https://`.

## Daily update routine

1. **Daily Brief.** Find what is new since the last issue about getting more out of Claude and spending fewer tokens. Sources are limited to Anthropic (code.claude.com/docs/en/changelog, anthropic.com/engineering, claude.com/blog, platform.claude.com docs, anthropic.com/news) and developers at the forefront of building with Claude (for example Simon Willison, and Anthropic staff writing publicly). No generic SEO listicles. Add one new issue to `issues[]`: TL;DR bullets, 3-5 items each linking to the main article, and quick hits. If there is nothing new, publish a short issue saying so with one evergreen technique; do not pad or repeat earlier issues.
2. **Glossary.** Any term in today's issue that a reader would not know and that is not already in the glossary gets a new entry dated today, and is listed in the issue's `newTerms`.
3. **Showcase.** Add 2-5 new posts of things people built with recently released models from any lab (not only Claude). Skip anything already in the feed.
4. Validate the JSON, commit, and push to the branch GitHub Pages deploys from.

## Writing style

- Glossary definitions use the Feynman technique for a teenager who knows basic programming: plain words, one concrete everyday analogy, no undefined jargon. `def` says what it is; `why` says why a developer should care (often the token or cost angle).
- Brief items are newsletter-short: what changed, the number that matters, what to try.
- Only state facts that the linked source supports. Read the source before summarising it. If a source could not be opened, say less rather than guess.
