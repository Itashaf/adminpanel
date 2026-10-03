# Design System — SchoolApp 360 Admin Panel

Purpose: one reference for the visual/interaction conventions already established across this codebase, so new pages and components match existing ones instead of each inventing their own look. When building something new, check here first; when a pattern here conflicts with a specific page, the more specific/newer pattern usually wins — update this file when that happens.

Stack: Next.js App Router, Tailwind CSS, `react-icons/fi` (Feather) as the default icon set, `react-icons/hi2` for a few specific icons (academic cap, light bulb).

---

## 1. Brand gradient

The one recurring brand gradient, used for primary buttons, active nav states, hero banners, print-report accents, chart lines:

```
bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600
```

Vertical orientation (e.g. a rail/accent bar) uses `bg-gradient-to-b from-blue-600 to-violet-700`.

Hero/banner backgrounds use a richer 3-stop version: `bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700`.

## 2. Color roles

Tailwind's `-50`/`-100` tints for soft backgrounds, `-600`/`-700` for text/icons on that tint. Same base hue, light background:

| Role | Hue |
|---|---|
| Primary / brand | indigo / violet / blue |
| Success / completed / present | emerald / green |
| Warning / pending | amber |
| Danger / absent / error | red |
| Neutral / draft / locked (historical) | gray |
| Info | blue / cyan |

A status pill is always `bg-{hue}-50 text-{hue}-700` (or `-600` for a slightly bolder dot color) with a small `w-1.5 h-1.5 rounded-full bg-{hue}-600` dot before the label — see `STATUS_STYLE` maps in `MonthlyDashboardExplorer.jsx`, `YearlyDashboardExplorer.jsx`, `SubjectTestsExplorer.jsx`.

Never invent a new hue for a new status — reuse the role table above.

## 3. Cards

Default card: `bg-white rounded-2xl border border-gray-100 shadow-sm`, padding `p-5` or `p-6` depending on density.

Pastel stat tile (dashboard stat rows — Students Report dashboards, Teacher dashboard KPI row): `rounded-2xl p-5 bg-{hue}-50`, small icon in a `bg-white/70` or `bg-{hue}-100` circle, uppercase 11-12px label, large bold number below.

**"Rail Stat Card"** (saved design, `components/dashboard/StatCard.jsx`'s `variant="rail"`): white card, a `w-1.5` gradient rail down the left edge (`bg-gradient-to-b from-blue-600 to-violet-700`), big number + caption on the left, a vertical divider, a trend-% pill (green/red) + a real delta figure on the right. Use for any "count + real trend" stat (Students, Teachers, etc.) — never fabricate the trend %, only pass a real computed figure.

Decorative gradient hero card (banners, pulse cards): `rounded-3xl bg-gradient-to-br ...` with a couple of absolutely-positioned blurred circles (`pointer-events-none absolute ... blur-3xl`) for ambient glow — purely decorative, never interactive.

## 4. Tables (list/explorer pages)

Canonical reference: `components/students/StudentsTable.jsx`. Every other list table in the app (Monthly/Yearly Reports, Subject Tests) is deliberately styled to match it, not its own independent design.

- Outer wrapper: `relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden` (no padding on the card itself — the table fills it).
- `<thead>`: `bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide`, cells `py-4`.
- `<tbody>`: `divide-y divide-gray-100`, cells `py-5`, row hover `hover:bg-gray-50/60 transition`.
- First/last cell gets the card's own side padding (`pl-6` / `pr-6`); inner cells use `pr-4`.
- Avatar: initials circle, `AVATAR_COLORS` palette cycling by row index — `['bg-blue-500', 'bg-violet-700', 'bg-purple-500', 'bg-indigo-600', 'bg-pink-500', 'bg-cyan-600']`.
- Bulk-select checkbox column: `w-[18px] h-[18px] rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500`, header checkbox = select-all.
- Bulk action toolbar sits **outside** the white table card (its own row above it), buttons always rendered but `disabled` when nothing is selected — not conditionally rendered on selection.
- Pagination: always the shared `components/Pagination.jsx`, inside the table card in a `px-6 py-4 border-t border-gray-100` wrapper, only rendered when `totalPages > 1`.
- Loading state: a shared shimmer skeleton component per module (e.g. `components/performance/PerformanceListSkeleton.jsx`) that mirrors the real layout (stat cards + table rows) with `animate-pulse` — never a bare "Loading..." string.

## 5. Buttons

`components/Button.jsx` is the only button component — never write a raw styled `<button>` for a primary/secondary action.

- `variant="primary"` (default): brand gradient, white text.
- `variant="secondary"`: `bg-gray-100 text-gray-900`.
- `variant="outline"`: transparent, blue border/text.
- `disabled`: forced to a flat gray regardless of variant.
- `fullWidth`: stretches to container width (used in modal footers, stacked mobile layouts).
- `form="id"`: lets a footer-pinned submit button submit a `<form>` it doesn't visually contain (see §7).

## 6. Dropdowns, inputs, pills

Every select-like control and every pill/chip-shaped text input in this app is fully rounded, not a sharp-cornered box:

```
rounded-full border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500
```

This applies to `components/Dropdown.jsx`, plain text `<input>`s in forms/modals, and the themed `components/DatePicker.jsx` / `components/MonthPicker.jsx` trigger buttons. Never use a native `<input type="date">` or `<input type="month">` — always the themed picker component, so the calendar UI matches the app's own styling instead of the browser default.

Badge/chip (`components/Badge.jsx`): `rounded-full px-2.5 py-1 text-xs font-medium`, one of a fixed color-variant map (green/amber/gray/violet/red/blue/pink/purple/orange/cyan/indigo/teal) — reuse a variant, don't invent a new hue inline.

## 7. Modals

Full pattern: `.claude/skills/modal-design/SKILL.md` (load it before building/editing any form modal). Summary:

- Built on the shared `components/Modal.jsx` only.
- A tall form modal gets a sticky `footer` prop (buttons pinned below the scrollable body) and `size="lg"`; a short 1-2 field confirm dialog skips both and keeps buttons inline.
- Pair related short fields into a 2-column `grid grid-cols-2 gap-4` row (Class + Section, Priority + Audience, Exam Date + Max Marks, …) instead of stacking every field full-width.
- A class/section picker always checks `classHasSections()` (`lib/hooks/useClassSections.js`) and disables/relabels the Section field as "No sections for this class" rather than requiring a section that doesn't exist for that class.

## 8. Icons

`react-icons/fi` (Feather) is the default set everywhere — stat cards, nav, buttons, table actions. Icon size is almost always `w-4 h-4` inline or `w-5 h-5` inside a dedicated icon tile. `react-icons/hi2` is used only for `HiOutlineAcademicCap` (class/section context) and was briefly used for a light-bulb quote icon (since removed). Don't introduce a third icon package.

Icon tiles: a small rounded square/circle with a tint background behind the icon — `w-9 h-9 rounded-xl bg-{hue}-100 text-{hue}-600` is the standard size for a card-header icon; `w-10 h-10`/`w-11 h-11` for a slightly more prominent one (table avatar, quick-action tile).

## 9. Sidebar / navigation

`components/dashboard/Sidebar.jsx`: dark gradient background (`bg-gradient-to-b from-purple-950 to-indigo-950`), active item gets the brand gradient pill, grouped items collapse into an accordion (`NavGroup`) with one group open at a time. Two static nav arrays (`ADMIN_NAV_ITEMS`, `TEACHER_NAV_ITEMS`) rather than one filtered-down list, because the two roles' structures genuinely differ, not just their permissions.

Gating layers, applied in order: `filterByFeatures` (school-level feature flags) → `filterByPermissions` (RBAC permission keys) → `filterByClassTeacher` (Class-Teacher-only children, e.g. Monthly/Yearly Reports). A hidden Sidebar link is never the only enforcement — the page/route itself must independently guard access (role check, `blockIfTeacher()`, or a scope assertion in the `lib/` function), since a hidden link never stops someone typing the URL.

## 10. Print templates (A4 report PDFs)

Reference: `components/performance/printMonthlyReport.js`, `printYearlyReport.js`. Black-and-white, boxed-table layout (not the app's own colored UI) — each section is a `.box` with a `.box-title` header band (`background: #ececec`), tables inside use `border-collapse`, a thin black header-bottom border, and `.strong`/`.center` utility classes. Keep the whole thing compact enough to fit one A4 page (`10mm 12mm` page padding, small font sizes — see the two files' `DOCUMENT_STYLE` blocks) — a report that spills onto a second page for a signature line is a bug, not a feature.

## 11. Decisions already made — don't re-litigate

- No fabricated data, anywhere. A trend %, a delta, a sparkline, a "+N this month" — only ever a real computed figure. If there's no real figure, omit the element rather than inventing a plausible-looking one.
- "View" access and "manage/edit" access are two separate checks, not one. A broad view permission (e.g. `timetable.view`) should usually be "any real signed-in user"; the narrower manage/edit check stays scoped (own class, own section, Admin-tier only).
- A hidden/removed UI feature doesn't necessarily mean the backend data is deleted — default to removing UI only, and ask before dropping schema/DB rows, since that's irreversible and may hold real data.
- Reuse an existing shared component (`Button`, `Modal`, `Dropdown`, `Pagination`, `Badge`, `DatePicker`/`MonthPicker`, `Toast`) before writing a new one-off styled element. A new "saved design" (like the Rail Stat Card above) gets a name and a spot in this file specifically so it doesn't get reinvented differently next time.
