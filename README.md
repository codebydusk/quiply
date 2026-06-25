# Quiply

A curated library of original quotes, wit, wisdom, and wonderfully questionable life advice, presented beautifully over dynamic fullscreen imagery.

![Quiply Preview](logo.svg)

## Features

- **Immersive Visuals**: Automatically fetches beautiful, random, high-resolution backgrounds from [Picsum](https://picsum.photos/) perfectly sized to your screen.
- **Categorized Quotes**: Choose your vibe from a variety of categories, including *Bad Advice*, *Chaos*, *Emotional Damage*, *Horoscope*, and more.
- **State Persistence**: Your last selected category is saved locally, so Quiply always opens exactly how you left it.
- **Glassmorphic UI**: Clean, unobtrusive interface featuring modern glassmorphism that keeps the focus on the photography and the typography.
- **Smooth Loading**: Features an elegant waterfall shimmer animation while images load in the background, ensuring a seamless aesthetic transition.

## Tech Stack

Quiply is a deliberately simple, lightweight project with zero dependencies:
- **Vanilla HTML5**
- **Vanilla CSS3**
- **Vanilla JavaScript** 

No build steps, no bundlers, no npm packages required. 

## Local Development

Since Quiply uses the `fetch()` API to load its quote JSON assets, you cannot open `index.html` directly via the `file:///` protocol due to browser CORS restrictions. You must serve it over a local web server.

1. Clone the repository
2. Run any simple HTTP server in the root directory. For example, using `npx`:
   ```bash
   npx http-server . -p 8080
   ```
   Or using Python:
   ```bash
   python -m http.server 8080
   ```
3. Open `http://localhost:8080` in your browser.

## Deployment

Quiply is ready to be hosted on any static file server like **GitHub Pages**, **Vercel**, or **Netlify**. Simply point the publishing directory to the repository root.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
