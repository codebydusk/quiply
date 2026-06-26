````md
![Quiply](assets/logo.svg)

# QUIPLY

> **Quiply is what happens when a quote generator develops a personality.**
>
> *Tiny thoughts. Big personalities.*

A minimalist quote experience featuring **original, hand-curated quote packs**, stunning full-screen photography, and a persistent shuffle engine that feels like drawing cards from a perfectly shuffled deck.

No repeated quotes.
No endless random loops.
Just beautifully presented thoughts.

🌐 **Live Demo:** https://codebydusk.github.io/quiply

---

## ✨ Features

- 🧠 **Persistent Shuffle Engine** — Every category behaves like a shuffled deck of cards. Quotes never repeat until the deck is exhausted.
- 🎲 **Surprise Me!** — A mathematically fair global shuffle where every quote has an equal chance of appearing.
- ✍️ **Original Quote Packs** — Thousands of curated quotes across humor, romance, chaos, workplace survival, and more.
- 🖼️ **Immersive Photography** — Beautiful full-screen backgrounds fetched dynamically from Lorem Picsum.
- 📋 **One-click Copy** — Complete with randomized copy-success messages.
- 📥 **Download / Share** — Save a beautifully rendered PNG or share directly on supported mobile browsers.
- 💾 **Persistent Progress** — Your categories, decks, and discoveries continue exactly where you left them.
- ⌨️ **Keyboard Shortcuts** — Press **Space** or **R** for the next quote.
- 🌙 **Zero Dependencies** — Pure HTML, CSS and JavaScript.

---

## 📦 Quote Packs

| Collection | Includes |
|------------|----------|
| 🌪 Core | NO · Chaos · Questionable Decisions · Character Development |
| ❤️ Relationships | Hopeless Romantic |
| 🎭 Life | Corporate Survival · Friendly Fire · Today's Lies |

More collections are planned.

---

## 🤔 Why Quiply?

Most quote generators repeatedly roll a random number.

That approach causes two problems:

- You often see the same quotes again and again.
- Smaller quote collections appear far more frequently than larger ones.

Quiply takes a different approach.

Every category is treated as a **shuffled deck**. Quotes are dealt one by one until every quote has been seen exactly once, creating a much more natural browsing experience.

The default **Surprise Me!** mode extends this concept even further by combining every quote pack into one global deck, giving every quote in the application the exact same mathematical probability of appearing.

---

## 🚀 Quick Start

```bash
git clone https://github.com/codebydusk/quiply.git
cd quiply

npx http-server . -p 8080
````

Then open:

http://localhost:8080

---

## 🛠 Tech Stack

| Layer        | Technology                       |
| ------------ | -------------------------------- |
| UI           | Vanilla HTML5 + CSS3             |
| Logic        | Vanilla JavaScript (ES2022+)     |
| Images       | Lorem Picsum                     |
| Fonts        | Cormorant Garamond · Martel Sans |
| Dependencies | **None**                         |

---

## 📂 Project Structure

```text
quiply/
├── index.html
├── manifest.webmanifest
├── robots.txt
├── sitemap.xml
└── assets/
    ├── style.css
    ├── script.js
    ├── logo.svg
    └── data/
```

---

## ⚙️ Under the Hood

Quiply is intentionally simple, but the quote engine is surprisingly sophisticated.

### Persistent Shuffle Decks

Instead of randomly selecting quotes forever, Quiply creates an integer deck for every category, shuffles it once using Fisher–Yates, and persists the current position locally.

This guarantees:

* no premature repeats
* equal distribution
* instant O(1) retrieval
* seamless continuation across browser sessions

### Secure Randomness

Whenever available, Quiply uses the browser's **Web Crypto API** to generate unbiased shuffle permutations, automatically falling back to `Math.random()` when secure randomness isn't available.

### Surprise Me!

Rather than choosing a random category first, Quiply merges every quote pack into one global deck so that **every quote in the application has the same probability of appearing**, regardless of category size.

---

## ❤️ Contributing

The quote packs are the heart of Quiply.

If you have an original quote, a clever roast, chaotic wisdom, terrible advice, or anything delightfully memorable, we'd love a Pull Request.

Please keep submissions:

* Original (or public domain)
* Human-written
* Short and memorable
* Appropriate for the selected category

---

## 🙏 Acknowledgements

Special thanks to these wonderful projects:

* no-as-a-service
* i-cannot-do-that
* quotd
* Lorem Picsum

Their ideas and openness helped shape Quiply.

---

## 📜 License

Licensed under the GNU GPL v3.0.

```
```
