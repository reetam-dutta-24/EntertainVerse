<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:responsive-ui-rules -->
# Responsive UI (required)

Every new route, page, section, and shared component must work well from **320px mobile** through **desktop**.

## Defaults

- **Mobile-first Tailwind**: start with single-column / compact layout; add `sm:`, `md:`, `lg:`, `xl:` as needed.
- **No fixed desktop-only shells**: sidebars use drawer + bottom nav below `lg`; never hardcode `pl-[sidebar]` without a `lg:` breakpoint.
- **Grids & carousels**: use `useColumnCount` + breakpoint configs in `lib/grid-section-config.ts` — never hardcode `grid-cols-6` or fixed items-per-page.
- **Cards**: prefer `w-full max-w-[…] mx-auto` over fixed `w-[…]` widths.
- **Section padding**: `px-4 sm:px-6 lg:px-8` (not `px-8` everywhere).
- **Section headers**: stack title + search on mobile (`flex-col gap-3 sm:flex-row`).
- **SearchPill**: `w-full sm:w-[230px]`.
- **CTAs in toolbars**: `w-full sm:w-auto` on mobile.
- **Typography**: `text-lg sm:text-xl` for section titles on dashboard (compact).

## Dashboard checklist for new pages

1. Wrap content in `w-full max-w-[1200px]` container with `gap-5 sm:gap-6` (dense dashboard spacing).
2. Reuse `WelcomeBanner`, responsive grid/carousel sections (already adaptive).
3. Stat panels: `grid-cols-2 lg:grid-cols-4`, smaller values on mobile (`text-xl sm:text-2xl`).
4. Filter rows: `flex-col sm:flex-row`, no fixed label widths.

## Landing / auth

- Provide mobile nav (hamburger) when desktop links are hidden.
- Hero: `min-h-[60dvh]` on mobile, not fixed 720px+ everywhere.
- Feature/stat cards: `w-full max-w-[260px] mx-auto`.
<!-- END:responsive-ui-rules -->
