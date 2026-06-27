![Quiply](assets/logo.svg)

# Quiply

*Tiny thoughts. Big personalities. Zero repeats.*

A minimalist quote player with hand-curated packs, fullscreen photography, and a persistent shuffle engine that prevents repeats and ensures fair distribution.

**Live demo: <https://codebydusk.github.io/quiply>**

---

## Table of contents

- [Quick start](#quick-start)
- [Features](#features)
- [Project structure](#project-structure)
- [Contributing](#contributing-please-help-growing-the-quote-database)
- [For nerds](#for-nerds--architecture--implementation-details)
- [License](#license)

---

## Quick start

Clone and serve locally:

```bash
git clone https://github.com/codebydusk/quiply.git
cd quiply

# Using npx (Node.js)
npx http-server . -p 8080

# Or using Bun (https://bun.sh)
bunx http-server . -p 8080

# Or using Python
python -m http.server 8080
```

Then open <http://localhost:8080>

---

## Features

- **Persistent Shuffle Engine** - Every category behaves like a shuffled deck of cards. Quotes never repeat until the deck is exhausted.
- **Today's Quiply** - A mathematically fair global shuffle where every quote has an equal chance of appearing.
- **Original Quote Packs** - Thousands of curated quotes across humor, romance, chaos, workplace survival, and more.
- **Immersive Photography** - Beautiful full-screen backgrounds fetched dynamically from Lorem Picsum.
- **One-click Copy** - Complete with randomized copy-success messages.
- **Download / Share** - Save a beautifully rendered PNG or share directly on supported mobile browsers.
- **Persistent Progress** - Your categories, decks, and discoveries continue exactly where you left them.
- **Keyboard Shortcuts** - Press **Space** or **R** for the next quote.
- **Zero Dependencies** - Pure HTML, CSS and JavaScript.

---

## Project structure

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
    └── data/  # JSON quote packs
```

---

## Contributing: Please help growing the Quote Database

Quip packs are the soul of Quiply.

**I'd love your help adding more real, hand-written, non-AI quotes to any category.**

If you have an original quote, a clever roast, chaotic wisdom, terrible advice, or anything delightfully memorable, I'd love a Pull Request.

Guidelines:

- Keep quotes original (or public domain)
- No AI-generated content
- Short, punchy lines work best
- Edit the appropriate JSON in `assets/data/` and open a PR

See the `assets/data/` folder for existing categories and formats.

---

## For nerds:  Architecture & implementation details

### Core Architecture

Quiply is built around a robust, persistent state machine designed to make the experience feel exactly like drawing physical cards from a well-shuffled deck, guaranteeing no premature repeats and an equal distribution of quotes regardless of category size.

#### 1. Cryptographic Shuffling Engine

The random number generation is strictly decoupled from the weak, predictable `Math.random()`. A global `SecureRandom` block dynamically probes the browser environment and leverages the rigorous **Web Crypto API** if available (HTTPS/Localhost), gracefully downgrading to standard math randomness to prevent crashes during local insecure network testing.

```mermaid
graph TD
    A["SecureRandom Engine"] --> B["Web Crypto API Available?"]
    B --> C["crypto.getRandomValues()"]
    B --> D["Math.random()"]
    C --> E["In-Place Fisher-Yates Shuffle"]
    D --> E
```

#### 2. Persistent Decks (`ShuffleDeck`)

Instead of just randomly picking string elements from a JSON array, Quiply generates a lightweight array of integers mapping to the exact length of the category `[0, 1, 2 ... N]`.

This integer array is shuffled, and items are dealt sequentially. A pointer (`index`) tracks exactly where the user left off. This extremely lightweight state object is committed to `localStorage` after every draw.

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Deck
    participant Storage

    User->>App: Triggers Refresh
    App->>Deck: next()
    Deck->>Deck: Check if deck is exhausted
    opt Exhausted
        Deck->>Deck: Generate new integer array
        Deck->>Deck: Cryptographic Fisher-Yates Shuffle
    end
    Deck->>Storage: Persist { index, indices }
    Deck-->>App: Return quote[indices[index]]
    App-->>User: Display Quote & Progress
```

#### 3. The Global "Today's Quiply" Deck (`GlobalQuoteManager`)

The default category solves a common probability flaw in simplistic quote generators. If the engine first picked a random category and *then* a random quote, it would massively bias the results toward smaller categories. Conversely, simply flattening every file into one array biases the results toward the largest categories.

To solve this, Quiply uses an ephemeral `GlobalQuoteManager` that mathematically normalizes representation. It samples exactly 15 random quotes from *every* active JSON quote file, aggregates them into a unified pool, and then securely extracts a fresh, perfectly blended subset of 100 quotes.

The `ShuffleDeck` then manages an integer map for this 100-quote subset. Once exhausted, a brand new permutation of 100 quotes is generated from scratch, meaning the "Random" mode stays endlessly fresh without repeating quotes within a session.

```mermaid
graph LR
    A[Random 15 quotes from NO] --> D
    B[Random 15 quotes from Love] --> D
    C[Random 15 quotes from Chaos] --> D
    D[Normalized Pool: ~120 quotes] -.->|Shuffle & Slice| E[100-Quote Master Deck]
    E --> F[Served Sequentially to UI]
```

#### 4. Instant Blob Caching

`picsum.photos` URLs aggressively redirect on every request. To prevent the background image and the Canvas download from loading two different photos, the image is fetched once via `fetch()`, converted to an immutable `blob:` URL, and instantly reused for both CSS rendering and Canvas manipulation.

#### 5. Self-Healing State Recovery

The core `refresh()` lifecycle is wrapped in a resilient recovery layer. If the engine encounters *any* runtime failure (such as parsing a corrupted `localStorage` state injected by a third-party extension), it immediately catches the error, triggers the `flushAll()` logic to wipe the broken storage, and seamlessly attempts a fresh retry without exposing a crash to the user.

---

## Acknowledgements

Quiply stands on the shoulders of some great open-source work:

- **[no-as-a-service](https://github.com/hotheadhacker/no-as-a-service)** by [@hotheadhacker](https://github.com/hotheadhacker) - the entire `NO` category is powered by this wonderful dataset. Thank you for making it open.
- **[i-cannot-do-that](https://github.com/teoc98/i-cannot-do-that)** by [@teoc98](https://github.com/teoc98) - a key inspiration for this project's spirit and format.
- **[quotd](https://github.com/codebydusk/quotd)** - an earlier project by the same author that Quiply grew out of, merged with the inspiration above.
- **[Lorem Picsum](https://picsum.photos/)** - beautiful, fast, free placeholder photography.

---

## License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.
