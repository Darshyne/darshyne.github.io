# darshyne.github.io

Public website of **Darshyne's Automation Suite (DAS)**, served by GitHub Pages at <https://darshyne.github.io/>.

- `index.html`: the whole page (no build step).
- `clips/`: web versions of the demo shorts (540×960, muted, H.264), with their poster images.
- `fr/index.html`: the French page, **generated** from `index.html` by `node tools/build-fr.mjs` (translation table inside; it stops if an English string it knows has changed). Run it after every change to `index.html`.
- `tools/serve.mjs`: local preview, `node tools/serve.mjs` then <http://localhost:8080/>.
