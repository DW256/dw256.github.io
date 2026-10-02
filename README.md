# Portfolio

Static portfolio hosted on GitHub Pages, using vanilla JavaScript, Markdown and Tailwind CSS.

## Development

Use Node.js 22 or newer.

On Windows, double-click `run-local.bat`. It installs missing dependencies, builds the site, and opens the local preview in your browser. Keep its console open; press **Ctrl+C** to stop the server. Close any existing preview on port 8765 before launching it again.

Or run the commands manually:

```sh
npm ci
npx playwright install chromium
npm run build
npm run preview
```

The preview runs at `http://127.0.0.1:8765`. It is a local development server, not a production server.

## Content

Project Markdown lives in `content/projects/`. Each publishable file needs frontmatter containing:

- `id`: a lowercase, hyphen-separated slug matching the filename.
- `title`, `summary`, `thumbnail`: non-empty strings.
- `tech`: an array of non-empty strings.
- Optional `order`: a finite number; otherwise alphabetical file order provides the default.
- Optional `links`: an object containing HTTP(S) URLs.

Thumbnail paths are relative to the site root. Screenshot paths are relative to their Markdown file, unless they begin with `/`. Local image files must exist. Remote image availability is not checked.

Files ending in `.draft.md` are excluded from the project manifest. **This does not make drafts private:** files committed to a publicly served Pages directory may still be downloadable.

```sh
npm run validate:projects  # Validate without writing output
npm run build             # Regenerate project manifest and CSS
npm run check:projects    # Check the manifest is current without writing
```

Commit both source changes and regenerated `data/projects.json` / `css/main2.css`. Tailwind scans only `index.html` and `js/`; add explicit sources in `css/main.css` if templates move elsewhere.

## Checks

```sh
npm test
npm audit
```

Tests cover content validation and Chromium browser behavior at desktop/mobile sizes. Browser tests serve the exact pinned Markdown libraries locally, checking their production integrity hashes. When updating a CDN library, update its development dependency, HTML URL/integrity hash and test fixture pin together.

CI validates dependencies and content, checks regenerated files for drift, and runs tests. It does not change or deploy the existing GitHub Pages configuration.
