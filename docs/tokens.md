# Design Tokens: PayBridge Demo Console

Documented design tokens for the console UI, defined as CSS custom properties. Implements the design direction from `frontend-demo-console.plan.md` section 6: *dense, quiet, scannable operator tool, not a landing page*. Status colours are never the only signal (accompanied by text or icons); values support both Light and Dark themes.

## 1. Color Palette

### Base Surfaces and Text
| Token | Light Theme | Dark Theme | Purpose |
|---|---|---|---|
| `--color-bg-canvas` | `#f8fafc` (slate-50) | `#090d16` (deep slate) | Main application canvas |
| `--color-bg-surface` | `#ffffff` (white) | `#111827` (slate-900) | Card, panel, and modal containers |
| `--color-bg-subtle` | `#f1f5f9` (slate-100) | `#1e293b` (slate-800) | Subtle backgrounds, active tabs, hover |
| `--color-bg-overlay` | `rgba(15, 23, 42, 0.4)` | `rgba(0, 0, 0, 0.65)` | Modal / dock backdrop |
| `--color-border-subtle` | `#e2e8f0` (slate-200) | `#1e293b` (slate-800) | Divider lines, card borders |
| `--color-border-strong` | `#cbd5e1` (slate-300) | `#334155` (slate-700) | Input borders, focused structures |
| `--color-text-primary` | `#0f172a` (slate-900) | `#f8fafc` (slate-50) | Primary headings, body copy, amounts |
| `--color-text-secondary` | `#475569` (slate-600) | `#94a3b8` (slate-400) | Labels, descriptions, table headers |
| `--color-text-muted` | `#94a3b8` (slate-400) | `#64748b` (slate-500) | Placeholders, timestamps, hints |

### Brand & Interactive Accent
| Token | Value | Purpose |
|---|---|---|
| `--color-accent` | `#2563eb` (blue-600) | Primary buttons, active navigation, key action highlights |
| `--color-accent-hover` | `#1d4ed8` (blue-700) | Hover state for accent buttons |
| `--color-accent-subtle` | `#eff6ff` (blue-50 / dark `#1e3a5f`) | Selected item background, correlated chips |
| `--color-accent-text` | `#ffffff` | Text on primary accent button |

### Semantic Status
| Status | Token Text | Token Bg | Purpose |
|---|---|---|---|
| **Success** | `--color-status-success-text` (`#15803d` / dark `#4ade80`) | `--color-status-success-bg` (`#f0fdf4` / dark `#052e16`) | Successful transfers, UP health, PAID, CONFIRMED |
| **Pending / Warn** | `--color-status-warning-text` (`#b45309` / dark `#fcd34d`) | `--color-status-warning-bg` (`#fffbeb` / dark `#451a03`) | In-progress transfers, waking, rate 429 wait, EXPIRED |
| **Error / Failed** | `--color-status-error-text` (`#b91c1c` / dark `#f87171`) | `--color-status-error-bg` (`#fef2f2` / dark `#450a0a`) | FAILED, REJECTED, 4xx/5xx errors, break detected |
| **Hold / Review** | `--color-status-held-text` (`#6b21a8` / dark `#c084fc`) | `--color-status-held-bg` (`#faf5ff` / dark `#3b0764`) | UNDER_REVIEW compliance cases, held FX rates |

### Log & Code Specific
| Token | Light Theme | Dark Theme | Purpose |
|---|---|---|---|
| `--color-log-bg` | `#0f172a` (slate-900) | `#060911` | Live log dock console background |
| `--color-log-text` | `#f1f5f9` (slate-100) | `#e2e8f0` | Default log message |
| `--color-log-info` | `#38bdf8` (sky-400) | `#38bdf8` | INFO level badge |
| `--color-log-warn` | `#fbbf24` (amber-400) | `#fbbf24` | WARN level badge |
| `--color-log-error` | `#f87171` (red-400) | `#f87171` | ERROR level badge |
| `--color-log-action` | `#a78bfa` (purple-400) | `#a78bfa` | Client Action Log (`→` sent / `←` finished) |

---

## 2. Typography

Two families: one sans for operator interface, one mono for identifiers, amounts, logs, request ids and JSON.

| Token | Family / Spec | Purpose |
|---|---|---|
| `--font-sans` | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | Interface text, buttons, forms |
| `--font-mono` | `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` | Account numbers, UUIDs, money, log lines |

### Type Scale
| Token | Font Size | Line Height | Tracking | Purpose |
|---|---|---|---|---|
| `--text-xs` | `11px (0.6875rem)` | `14px` | `0` | Timestamps, tags, tiny chips |
| `--text-sm` | `13px (0.8125rem)` | `18px` | `0` | Dense table rows, helper notes, badges |
| `--text-base` | `14px (0.875rem)` | `20px` | `0` | Base UI size: forms, inputs, body copy |
| `--text-md` | `16px (1rem)` | `24px` | `-0.01em` | Section headers, card titles |
| `--text-lg` | `18px (1.125rem)` | `26px` | `-0.015em` | Page subheaders, major values |
| `--text-xl` | `22px (1.375rem)` | `30px` | `-0.02em` | Page titles, hero balances |

All money values use `font-variant-numeric: tabular-nums` to ensure stable tabular vertical alignment.

---

## 3. Spacing Scale

Compact 4px base grid designed for density without crowding:

| Token | Size | Typical Use |
|---|---|---|
| `--space-1` | `4px (0.25rem)` | Gap between badge icon and text, tiny offsets |
| `--space-2` | `8px (0.5rem)` | Button padding-y, gap in compact list |
| `--space-3` | `12px (0.75rem)` | Input padding-y, card header gap |
| `--space-4` | `16px (1rem)` | Card padding, standard container spacing |
| `--space-6` | `24px (1.5rem)` | Section gaps, grid gutters |
| `--space-8` | `32px (2rem)` | Page level padding, major route breaks |

---

## 4. Radii & Borders

| Token | Value | Purpose |
|---|---|---|
| `--radius-sm` | `4px` | Badges, small chips, request-id pill |
| `--radius-md` | `6px` | Input fields, action buttons |
| `--radius-lg` | `8px` | Cards, workspace containers, inspector dock |
| `--border-width` | `1px` | Crisp structural borders (no heavy outlines) |

---

## 5. Elevation & Shadows

Subtle shadows to avoid flat indistinguishability without decorative bloat:

| Token | Value | Purpose |
|---|---|---|
| `--shadow-sm` | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | Buttons, input focus, cards |
| `--shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)` | Dropdowns, flyouts, popovers |
| `--shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)` | Modals, floating dock, inspector sheet |

---

## 6. Motion & Transitions

Functional, swift, predictable (`emil-design-eng`):
- Log lines **never animate**.
- Balances and status changes animate swiftly with easing.
- Respect `@media (prefers-reduced-motion: reduce)`.

| Token | Duration | Timing Function | Purpose |
|---|---|---|---|
| `--duration-instant` | `100ms` | `cubic-bezier(0.4, 0, 0.2, 1)` | Hover states, button clicks |
| `--duration-fast` | `180ms` | `cubic-bezier(0.4, 0, 0.2, 1)` | Dropdowns, fade in/out |
| `--duration-normal` | `250ms` | `cubic-bezier(0.4, 0, 0.2, 1)` | Timeline step progress, dock expand |
