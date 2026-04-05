# SimPPL.org — Complete Frontend Design & Styling Guide

> Extracted from full visual analysis of simppl.org across all pages:
> **Homepage**, **Research**, **About Us** — all sections documented below.

---

## 1. 🎨 Color Palette

### Primary Colors

| Name | Hex | Usage |
|---|---|---|
| **Dark Navy** | `#1a1a3e` | Primary headings, logo text, body text |
| **Coral / Terracotta** | `#c0522b` | Accent word in hero ("Trust"), stat numbers, highlighted links, section titles (Arbiter, SimPPL Fellowship) |
| **Purple Maroon** | `#6b2d50` | Secondary section titles ("Sakhi", "Partners", "Impact", "Journey", "Our Journey") |
| **Deep Indigo** | `#3730a3` | Active nav underline, active filter button fill |
| **Pure White** | `#ffffff` | All page backgrounds, card backgrounds, nav background |
| **Light Gray BG** | `#f3f4f6` | Alternate section backgrounds, card interiors |
| **Border Gray** | `#e5e7eb` | Card borders, input borders, dividers |
| **Body Text** | `#374151` | Regular paragraph text |
| **Muted Text** | `#6b7280` | Subheadings, descriptions, placeholders |
| **Black** | `#111827` | Footer subscribe button, nav link text |

### Gradient (CTA Buttons & Timeline)

```css
/* Primary CTA Button Gradient */
background: linear-gradient(to right, #c0522b, #5c2d82);

/* Timeline line gradient */
background: linear-gradient(to right, #e05c2a, #3b1f6b);
```

---

## 2. 🔤 Typography

### Font Family

The site uses a **clean, modern geometric sans-serif**. Based on visual analysis it is almost certainly **Inter** (or possibly Outfit/Manrope):

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

### Type Scale

| Element | Size | Weight | Color | Notes |
|---|---|---|---|---|
| **Hero Heading** | 72–88px | 900 (Black) | `#1a1a3e` | Two-line, centered |
| **Hero Accent Word** | Same size | 900 | `#c0522b` | e.g., "Trust" |
| **Section Title (H2)** | 48–60px | 700 | varies (navy or maroon/coral) | Centered |
| **Sub-section Title** | 28–36px | 600 | `#1a1a3e` | e.g., "Public Observatory for Digital Discourse" |
| **Card Title (H3)** | 18–20px | 600 | `#1a1a3e` | |
| **Body / Description** | 16–18px | 400 | `#374151` | Line-height ~1.7 |
| **Muted/Caption** | 14–15px | 400 | `#6b7280` | |
| **Stats Numbers** | 40–48px | 700 | `#c0522b` | e.g., "250M+", "10+" |
| **Stats Labels** | 14–16px | 400 | `#374151` | Below stats numbers |
| **Nav Links** | 15–16px | 500 | `#111827` | |
| **Button Text** | 15–16px | 600 | `#ffffff` | |
| **Badge/Tag Text** | 12–13px | 500 | `#374151` | Inside pill badges |
| **Footer Heading** | 14–16px | 600 | `#111827` | "Quick Links", etc. |
| **Footer Links** | 14px | 400 | `#374151` | |
| **Copyright** | 13–14px | 400 | `#6b7280` | |

### Key Typography Behaviors

- The hero heading splits across two lines with the accent word mid-sentence
- Section headings can mix two colors (e.g., "Our" in navy + "Journey" in coral)
- Inline highlights in body text use `#c0522b` (coral) for emphasis (e.g., "200+ engineers, researchers, and practitioners", "Google, Mozilla, Wikipedia, and MIT")
- Letter-spacing on section headings: `letter-spacing: -0.02em` to `-0.03em`

---

## 3. 🧭 Navigation Bar

### Structure

```
[Logo: SimPPL + icon] ............... [Home] [Research] [About Us] [Careers] [Newsletter]  [Get in touch]
```

### Styling

```css
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb; /* subtle or none */
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-link {
  font-size: 15px;
  font-weight: 500;
  color: #111827;
  text-decoration: none;
  padding-bottom: 4px;
}

.nav-link.active {
  border-bottom: 2px solid #3730a3; /* indigo underline */
  color: #111827;
}

.nav-cta {
  padding: 10px 24px;
  border: 1.5px solid #111827;
  border-radius: 9999px; /* full pill */
  background: transparent;
  font-size: 15px;
  font-weight: 500;
  color: #111827;
  cursor: pointer;
}

.nav-cta:hover {
  background: #111827;
  color: #ffffff;
}
```

### Logo

- Text: **"Sim"** (regular weight) + **"PPL"** (bold) in dark navy `#1a1a3e`
- Icon: Mandala/flower-of-life style circular SVG icon, multicolored (resembles a colorful wheel)
- Tagline below logo: "Rebuild Digital Trust. Responsibly" — tiny, gray

---

## 4. 🦸 Hero Section (Homepage)

### Layout

- Full viewport height (or close to it), white background
- **Animated background**: Network graph / constellation dots-and-lines effect (canvas or SVG animation — thin gray lines `#d1d5db` connecting small dots `#9ca3af`)
- All content **centered**

### Content Structure

```
[animated network graph canvas behind everything]

        Rebuilding [Trust]
      in Online Information

  Our AI copilot helps journalists, researchers, and platforms
  to trace the evolution of digital narratives across communities
  on the internet.

          [ Explore our solutions → ]
```

### Styles

```css
.hero {
  position: relative;
  min-height: 90vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 24px;
  overflow: hidden;
}

.hero-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  /* canvas with animated network nodes */
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 900px;
}

.hero-heading {
  font-size: clamp(48px, 8vw, 88px);
  font-weight: 900;
  color: #1a1a3e;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin-bottom: 32px;
}

.hero-heading .accent {
  color: #c0522b; /* coral */
}

.hero-subtext {
  font-size: 18px;
  color: #6b7280;
  max-width: 580px;
  margin: 0 auto 48px;
  line-height: 1.7;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 40px;
  background: linear-gradient(to right, #c0522b, #5c2d82);
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  text-decoration: none;
}
```

---

## 5. 🃏 Feature Cards (Sakhi / Fellowship)

### Card Style

White background, light gray border, subtle shadow.

```css
.feature-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-card .icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #fde8e0; /* soft salmon/coral tint */
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-card .icon-wrapper svg {
  color: #c0522b; /* coral icon */
  width: 20px;
  height: 20px;
}

.feature-card h3 {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a3e;
}

.feature-card p {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
}

.feature-card .badge {
  display: inline-block;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 9999px;
  margin-top: auto;
}
```

### Grid Layouts

```css
/* Sakhi: 2x2 feature grid */
.features-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

/* Fellowship: 4-column grid */
.features-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .features-grid-2,
  .features-grid-4 {
    grid-template-columns: 1fr;
  }
}
```

---

## 6. 📊 Stats / Counter Section

Numbers are large and in coral accent color, labels are dark gray below.

```css
.stats-row {
  display: flex;
  justify-content: center;
  gap: 64px;
  text-align: center;
  padding: 40px 0;
}

.stat-item .number {
  font-size: 44px;
  font-weight: 700;
  color: #c0522b; /* coral */
  line-height: 1.1;
}

.stat-item .label {
  font-size: 14px;
  color: #374151;
  margin-top: 6px;
}
```

---

## 7. ⏱️ Timeline Component

Used in both "Impact" (About page) and "Our Journey" sections.

### Visual

- Horizontal line with **gradient from orange-coral (left) to navy-purple (right)**
- Year markers: small circles on the line
- **Active/selected year**: larger circle with coral border + white fill + coral text
- **Inactive years**: smaller outlined circles, gray
- Content cards appear below each marker

### Code

```css
.timeline-wrapper {
  position: relative;
  padding: 48px 0;
  overflow-x: auto;
}

.timeline-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(to right, #e05c2a, #3b1f6b);
  transform: translateY(-50%);
}

.timeline-markers {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.marker-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
}

.marker-dot.active {
  width: 72px;
  height: 72px;
  border: 3px solid #c0522b;
  color: #c0522b;
  font-size: 18px;
  font-weight: 700;
}

/* Year label pill (in "Our Journey" variant) */
.year-pill {
  background: linear-gradient(to bottom right, #c0522b, #5c2d82);
  color: #ffffff;
  padding: 8px 20px;
  border-radius: 9999px;
  font-size: 16px;
  font-weight: 700;
}

/* Card below each timeline year */
.timeline-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a3e;
  min-width: 140px;
  text-align: center;
}
```

---

## 8. 🔬 Achievements Card (About page)

Large contained card with a soft border and rounded corners.

```css
.achievements-card {
  max-width: 840px;
  margin: 0 auto;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 40px;
  background: #ffffff;
}

.achievements-card h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a3e;
  text-align: center;
  margin-bottom: 32px;
}

.achievement-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.achievement-item {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.achievement-item .big-number {
  font-size: 40px;
  font-weight: 800;
  color: #c0522b; /* coral for "1", "2" */
  line-height: 1;
  min-width: 48px;
}

.achievement-item .big-number.highlight {
  color: #c0522b; /* "7.5K" also coral */
}

.achievement-item h4 {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a3e;
  margin-bottom: 8px;
}

.achievement-item p {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
}
```

---

## 9. 🔖 Filter Tabs (Research page)

Pill-shaped filter tabs for the project gallery.

```css
.filter-tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.filter-tab {
  padding: 8px 20px;
  border-radius: 9999px;
  border: 1.5px solid #d1d5db;
  background: #ffffff;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tab:hover {
  border-color: #9ca3af;
}

.filter-tab.active {
  background: #3730a3; /* indigo */
  color: #ffffff;
  border-color: #3730a3;
}
```

---

## 10. 🖼️ Project Gallery Cards (Research page)

Image-led cards with title and authors below.

```css
.project-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.project-card {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.08);
}

.project-card img {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
}

.project-card .card-body {
  padding: 16px 20px;
}

.project-card h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a3e;
  margin-bottom: 6px;
}

.project-card .authors {
  font-size: 13px;
  color: #6b7280;
}
```

---

## 11. 🤝 Partners Section

Horizontal scroll of partner logos, black & white style.

```css
.partners-section {
  padding: 80px 0;
  background: #ffffff;
  text-align: center;
}

.partners-logos {
  display: flex;
  align-items: center;
  gap: 48px;
  overflow-x: auto;
  padding: 32px 48px;
  scrollbar-width: none;
}

.partners-logos::-webkit-scrollbar {
  display: none;
}

.partners-logos img {
  height: 40px;
  width: auto;
  object-fit: contain;
  filter: grayscale(0); /* kept in color from screenshots */
  opacity: 0.85;
  flex-shrink: 0;
}
```

---

## 12. 📱 Product Feature Sections (Arbiter & Sakhi)

These sections have a **section title + subtitle + description + visual mock** layout.

```css
.product-section {
  padding: 100px 24px;
  background: #f8f9fa; /* slightly off-white */
  text-align: center;
}

.product-title {
  font-size: 56px;
  font-weight: 700;
  color: #c0522b; /* coral for "Arbiter" */
  /* OR: color: #6b2d50 for "Sakhi" (maroon-purple) */
  margin-bottom: 12px;
}

.product-subtitle {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a3e;
  margin-bottom: 20px;
}

.product-description {
  font-size: 16px;
  color: #6b7280;
  max-width: 600px;
  margin: 0 auto 48px;
  line-height: 1.7;
}

.product-mock {
  max-width: 720px;
  margin: 0 auto;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,0.06);
}
```

---

## 13. 📬 Footer

### Layout

```
[SimPPL Logo + icon]
[Newsletter tagline + description]
[Name input] [Email input] [Profession input] [Subscribe button]

                          [Quick Links] [Also Check!] [Connect With Us]
                          Research      Arbiter        Contact us
                          About Us      AI4Health      𝕏 Twitter
                          Careers       NextGenAI      in LinkedIn
                          Team
                          Newsletter

          © 2026 SimPPL. All rights reserved.
```

### Styles

```css
.footer {
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  padding: 60px 48px 32px;
}

.footer-top {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 80px;
  margin-bottom: 48px;
}

.footer-brand h3 {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a3e;
  margin-bottom: 6px;
}

.footer-brand p {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 20px;
}

.newsletter-form {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.newsletter-input {
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  background: #ffffff;
  min-width: 160px;
  outline: none;
}

.newsletter-input:focus {
  border-color: #9ca3af;
}

.newsletter-input::placeholder {
  color: #9ca3af;
}

.subscribe-btn {
  padding: 10px 20px;
  background: #111827;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: 48px;
}

.footer-links-col h4 {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 16px;
}

.footer-links-col a {
  display: block;
  font-size: 14px;
  color: #374151;
  text-decoration: none;
  margin-bottom: 10px;
}

.footer-links-col a:hover {
  color: #111827;
}

.footer-copyright {
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  padding-top: 32px;
  border-top: 1px solid #e5e7eb;
  margin-top: 48px;
}
```

---

## 14. 📐 Layout & Spacing System

```css
/* Max content widths */
.container { max-width: 1200px; margin: 0 auto; padding: 0 48px; }
.container-narrow { max-width: 860px; margin: 0 auto; }
.container-text { max-width: 660px; margin: 0 auto; }

/* Section vertical padding */
.section { padding: 80px 0; }
.section-lg { padding: 120px 0; }

/* Standard gaps */
--gap-sm: 12px;
--gap-md: 24px;
--gap-lg: 48px;
--gap-xl: 80px;

/* Border radius */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-pill: 9999px;
```

---

## 15. 🌐 Section Layout Patterns

| Section | Layout | Background |
|---|---|---|
| Hero | Centered flex, full-width | White + canvas animation |
| Arbiter | Center-aligned, text above product mock | White |
| Sakhi | Left: 2x2 cards, Right: phone mockup | Light gray `#f3f4f6` |
| SimPPL Fellowship | Center title + 4-col cards | White |
| Partners | Center title + horizontal logo scroll | White |
| Footer | 2-col grid (brand+form | links) | White |
| About Hero | Centered text, inline highlights | White |
| Stats row | 3-col centered flex | White |
| Impact Timeline | Center title + horizontal timeline | White |
| Achievements | Centered max-width card | White |
| Research Hero | Left-aligned heading + stats | White |
| Project Gallery | Filter row + 3-col image cards | White |

---

## 16. 🎯 Inline Text Highlights

Body text has **inline coral-colored spans** for emphasis:

```css
.highlight-coral {
  color: #c0522b;
  font-weight: 600;
}
```

Used for:
- "200+ engineers, researchers, and practitioners" (About page)
- "Google, Mozilla, Wikipedia, and MIT" (About page)
- ">60% gains" (Sakhi section)

---

## 17. 🔘 Button System

```css
/* Primary gradient (CTA) */
.btn-primary {
  padding: 14px 36px;
  background: linear-gradient(to right, #c0522b, #5c2d82);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Outlined (navbar CTA) */
.btn-outline {
  padding: 10px 24px;
  background: transparent;
  border: 1.5px solid #111827;
  color: #111827;
  font-size: 15px;
  font-weight: 500;
  border-radius: 9999px;
  cursor: pointer;
}

/* Secondary outlined pill with arrow */
.btn-secondary {
  padding: 12px 28px;
  background: linear-gradient(to right, #c0522b, #5c2d82);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Small badge stat (e.g., "150+ fellows trained") */
.btn-badge {
  padding: 4px 12px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
  font-weight: 500;
  border-radius: 9999px;
  border: none;
  display: inline-block;
}

/* Join Us (About page) */
.btn-join {
  padding: 14px 32px;
  background: linear-gradient(to right, #c0522b, #5c2d82);
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  border: none;
  cursor: pointer;
}

/* Black subscribe button */
.btn-dark {
  padding: 10px 20px;
  background: #111827;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}
```

---

## 18. 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) {
  .hero-heading { font-size: 36px; }
  .features-grid-4 { grid-template-columns: 1fr; }
  .features-grid-2 { grid-template-columns: 1fr; }
  .project-gallery { grid-template-columns: 1fr; }
  .stats-row { flex-direction: column; gap: 24px; }
  .footer-top { grid-template-columns: 1fr; }
  .footer-links { grid-template-columns: repeat(2, auto); }
  .newsletter-form { flex-direction: column; }
  .container { padding: 0 20px; }
}

/* Tablet */
@media (max-width: 1024px) {
  .hero-heading { font-size: 56px; }
  .features-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .project-gallery { grid-template-columns: repeat(2, 1fr); }
}
```

---

## 19. ✨ Special Visual Effects

### Network Graph Background (Hero)
Animated canvas with floating dots connected by thin lines — a data/network visualization aesthetic. Typically implemented with:
- `<canvas>` element with JS animation
- Random dot positions, connected when within a threshold distance
- Dots move slowly, lines fade based on distance
- Colors: dots `rgba(150, 150, 170, 0.5)`, lines `rgba(150, 150, 170, 0.2)`

### Hover States
- Cards lift with `transform: translateY(-4px)` + subtle shadow
- Buttons darken slightly on hover
- Nav links: no animation, just underline on active

### Shadows
```css
--shadow-card: 0 2px 8px rgba(0,0,0,0.06);
--shadow-card-hover: 0 12px 32px rgba(0,0,0,0.10);
--shadow-product-mock: 0 8px 40px rgba(0,0,0,0.06);
```

---

## 20. 🗂️ Complete Page Structure

### Homepage
1. Navbar
2. Hero (network bg + heading + subtext + CTA)
3. Arbiter section (product intro + dashboard mock)
4. Sakhi section (product intro + 2x2 cards + phone mock)
5. SimPPL Fellowship section (heading + 4-col cards + CTA)
6. Partners section (heading + logo scroll)
7. Footer

### Research Page
1. Navbar
2. Page heading ("Find Out What's Cooking at **SimPPL**")
3. Stats row (10+ / 5+ / 17+)
4. "Explore Our Project Gallery" + filter tabs
5. Project image card grid (3 cols)
6. Footer

### About Page
1. Navbar
2. "About Us" section (text + inline coral highlights + stats row + Join Us button)
3. "Impact" section (section title + horizontal timeline with year selector)
4. Year achievement card (Achievements grid)
5. "Our Journey" section (timeline with pill-year markers + event cards)
6. Footer

---

## 21. 🎨 CSS Custom Properties (Design Tokens)

```css
:root {
  /* Colors */
  --color-navy: #1a1a3e;
  --color-coral: #c0522b;
  --color-maroon: #6b2d50;
  --color-indigo: #3730a3;
  --color-white: #ffffff;
  --color-gray-light: #f3f4f6;
  --color-border: #e5e7eb;
  --color-text: #374151;
  --color-muted: #6b7280;
  --color-black: #111827;

  /* Gradients */
  --gradient-cta: linear-gradient(to right, #c0522b, #5c2d82);
  --gradient-timeline: linear-gradient(to right, #e05c2a, #3b1f6b);

  /* Typography */
  --font-base: 'Inter', system-ui, sans-serif;
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 24px;
  --text-2xl: 32px;
  --text-3xl: 48px;
  --text-4xl: 64px;
  --text-hero: clamp(48px, 8vw, 88px);

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* Borders */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-pill: 9999px;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
  --shadow-md: 0 8px 24px rgba(0,0,0,0.08);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.10);
}
```

---

*This guide covers all visible pages and components from the SimPPL.org screenshots. It is intended as a complete reference for replicating the visual design system in any frontend stack.*
