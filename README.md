![Quiply](assets/logo.svg)

# QUIPLY

> *Wit, wisdom, and wonderfully questionable life advice — beautifully presented.*

Quiply is a minimalist quote app that pairs curated, hand-picked quotes with stunning full-screen photography. Pick a category, vibe out, copy or download the moment.

🌐 **Live:** [codebydusk.github.io/quiply](https://codebydusk.github.io/quiply)

---

## ✨ Features

- 🖼️ **Immersive backgrounds** — hi-res photos from [Lorem Picsum](https://picsum.photos/), sized to your screen and pixel density
- 🎲 **Categorized & shuffled** — every quote shown exactly once before reshuffling, with no back-to-back repeats
- 📋 **Copy** — one tap to grab the quote text to your clipboard
- 📥 **Download / Share** — on desktop, saves a ready-to-share PNG. On mobile, instantly opens the native share sheet with the image.
- ⌨️ **Keyboard shortcuts** — press **Space** or **R** to refresh instantly
- 💾 **Remembers your category** — your last selection is saved locally
- 🌙 **Dark, glassmorphic UI** — clean, unobtrusive, and fully responsive

---

## For Users

**How to use it:**

1. Open the app.
2. Pick a category from the top-right menu (or let **Random** surprise you).
3. Hit the **↻ refresh** button (or press **Space** / **R**) for a new quote + background.
4. Like what you see? Hit **copy** to grab the text, or **↓ download / share** to save it as a PNG (or share it directly on mobile).

**Categories:**

| Group | Categories |
|---|---|
| Daily | NO · Chaos · Questionable Decisions · Character Development |
| Delulu | Hopeless Romantic |
| Everyday Chaos | Corporate Survival · Friendly Fire · Today's Lies |

Your last selected category is automatically remembered for next time.

---

## For Developers

### Tech Stack

Quiply is intentionally simple — **zero dependencies, zero build steps.**

| Layer | Technology |
|---|---|
| Structure | Vanilla HTML5 |
| Styling | Vanilla CSS3 (custom properties, `backdrop-filter`, `clamp()`) |
| Logic | Vanilla JavaScript (ES2022+) |
| Images | [Lorem Picsum](https://picsum.photos/) — fetched as blob URLs |
| Fonts | Google Fonts — Cormorant Garamond (quotes) · Martel Sans (UI) |

### Project Structure

```
quiply/
├── index.html              # Single-page app shell
├── manifest.webmanifest    # PWA manifest
├── robots.txt
├── sitemap.xml
└── assets/
    ├── style.css           # All styles
    ├── script.js           # All logic (fully commented)
    ├── logo.svg            # App icon
    └── data/               # Quote databases (JSON arrays of strings)
        ├── bad_advice.json
        ├── chaos.json
        ├── emotional_damage.json
        ├── horoscope.json
        ├── insults.json
        ├── love.json
        ├── no.json
        └── office_excuses.json
```

### Local Development

Because Quiply uses `fetch()` to load JSON data assets, you can't open `index.html` directly via `file:///` (browser CORS policy blocks it). Serve it over a local HTTP server instead:

```bash
# Using npx (Node.js)
npx http-server . -p 8080

# Using bunx (Bun | https://bun.sh)
bunx http-server . -p 8080

# Or using Python
python -m http.server 8080
```

Then open `http://localhost:8080`.

### Key Architecture Notes

- **Blob URL image loading** — `picsum.photos` URLs redirect on every request. To prevent the background image and the downloaded PNG from being two different photos, the image is fetched once, converted to a `blob:` URL, and reused everywhere.
- **Shuffle queue system** — each category maintains its own Fisher-Yates shuffled deck. Quotes are dealt one at a time until exhausted, then reshuffled. A boundary check prevents the same quote appearing back-to-back across reshuffles.
- **Canvas download** — the download button renders directly to a `<canvas>` using the already-decoded `Image` object. No re-fetch, no DOM capture library — instant.

### Deployment

Quiply deploys to any static host. Just point the root of the repository as the publish directory.

- **GitHub Pages:** push to `main`, set Pages source to `/ (root)`.
- **Vercel / Netlify:** connect the repo, no build command needed.

---

## 🙏 Contributing — Help Grow the Quote Database!

The quotes are the heart of Quiply, and the database genuinely benefits from human voice over algorithmic output.

**We'd love your help adding more real, hand-written, non-AI quotes to any category.**

If you've got a sharp one-liner, a piece of chaotic wisdom, a roast that deserves to live forever, or advice so bad it's good — please open a **Pull Request**!

### How to contribute quotes

1. Fork this repository.
2. Open the relevant JSON file in `assets/data/`.
3. Add your quote(s) as plain strings to the array.
4. Open a PR with a short description of what you added.

**A few simple guidelines:**
- Quotes should be **original or in the public domain** — please don't submit copyrighted lines.
- **No AI-generated quotes.** The whole point is the human touch — messy, specific, and real.
- Keep them punchy. Shorter is usually better.
- One PR per category is easiest to review.

> All PRs will be reviewed and merged by [@codebydusk](https://github.com/codebydusk). Thank you in advance — every quote added makes Quiply a little more alive. 💛

---

## Acknowledgements

Quiply stands on the shoulders of some great open-source work:

- **[no-as-a-service](https://github.com/hotheadhacker/no-as-a-service)** by [@hotheadhacker](https://github.com/hotheadhacker) — the entire `NO` category is powered by this wonderful dataset. Thank you for making it open.
- **[i-cannot-do-that](https://github.com/teoc98/i-cannot-do-that)** by [@teoc98](https://github.com/teoc98) — a key inspiration for this project's spirit and format.
- **[quotd](https://github.com/codebydusk/quotd)** — an earlier project by the same author that Quiply grew out of, merged with the inspiration above.
- **[Lorem Picsum](https://picsum.photos/)** — beautiful, fast, free placeholder photography.

---

## License

This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE](LICENSE) file for details.
