# True Men — Modern Menswear Storefront

Contemporary multi-brand menswear e-commerce prototype for True Men, Navsari, India. A static React + Vite single-page storefront migrated 1:1 from the original HTML concept.

## Features

- Home: hero slider, category tiles, bestsellers, brand marquee, promo, reviews, newsletter
- Shop: search, category / price / size / color / rating filters, sorting, skeleton loading, empty state
- Product: gallery with thumbnails + zoom, color/size selection, quantity, related products
- Bag: quantity controls, TRUE10 promo (10% off), shipping logic, order summary, mini-cart drawer
- Wishlist with move-to-bag
- About, Contact with live Google Maps embed for Navsari store
- Mobile menu, filters drawer, toasts, scroll-reveal, persisted cart/wishlist via localStorage

## Tech Stack

- React 18, Vite 5
- Custom CSS (`src/index.css`, exact port of original styles)
- Tailwind browser CDN, Manrope + DM Sans, Font Awesome (same as original)
- No backend — static prototype only

## Project Structure

- `index.html` — entry, fonts, favicon (`/favicon.svg`)
- `public/favicon.svg` — TM monogram
- `src/main.jsx` — React mount
- `src/App.jsx` — routing (hash), pages, cart/wishlist state
- `src/data.js` — 18-product catalog, images, pricing
- `src/index.css` — full site styles
- `original.html` — source reference

## Getting Started

```bash
npm install
npm run dev
```

Build / preview:

```bash
npm run build
npm run preview
```

## Store

- **True Men Store, Navsari** — Dudhia Talav Shopping Center Road, Beside Ramanand Restaurant, Navsari, Gujarat, India 396445
- Instagram: https://www.instagram.com/true_men_____?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw==
- WhatsApp: https://wa.me/message/7GRGQAAWQ6V4P1

## Status

Prototype — static demo only. Checkout, newsletter, and contact form are UI-only with toast/confirmation states.
