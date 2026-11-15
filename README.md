# Getting Up To Speed

A personal, non-indexed reference site for AI agentic software development.

- **Glossary** – key terms explained simply, newest first, with instant search.
- **Daily Brief** – a TL;DR newsletter on getting more from Claude for fewer tokens, linking to the source articles.
- **Showcase** – a scrollable feed of things people are building with the latest AI models.

Plain HTML, CSS and JavaScript. Content lives in `data/*.json`; see `CLAUDE.md` for the format and the daily update routine.

## Publish

Settings → Pages → Source: **GitHub Actions**. `.github/workflows/pages.yml` deploys on every push.

## Preview locally

```bash
python3 -m http.server 8000
```
