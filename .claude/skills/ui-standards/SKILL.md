---
name: ui-standards
description: Apply the console's UI, accessibility and design rules. Use whenever creating or changing a screen, component, form, table, dialog, the log dock, animation or styling.
---

# UI standards

Policy owner: project owner. Source: plan section 6, invariants 9 and 10; spec section 3. Design direction: a dense, quiet, scannable operator tool, not a landing page. The first screen is the working console.

1. **Tokens first.** Colours, spacing, type scale, radii, elevation and motion durations come from `docs/tokens.md` as CSS variables. No hard-coded values. Light and dark themes.
2. **States.** Every data view designs: loading, empty, error, offline, backend asleep, rate-limited, unauthorized. A view with only a happy path is incomplete.
3. **Accessibility (WCAG 2.2 AA).** Every input has a connected label; errors are linked with the field and announced; required fields are marked for assistive technology, not only by an asterisk; interactive elements are real buttons, links or inputs; visible focus; full keyboard use; dialogs trap and restore focus.
4. **Status is never colour alone.** Add text or an icon.
5. **Live regions.** The log pane announces a rate-limited summary ("12 new lines, 1 warning"), never every line.
6. **Motion.** Minimal and functional: state changes may fade or slide briefly; log lines never animate; respect reduced motion.
7. **Typography.** One interface font, one mono for ids, amounts and logs, tabular figures for money. Long labels wrap; check phone and projector widths.
8. **No anti-patterns.** No cards inside cards, decorative gradients, hero banners or marketing copy; icons for familiar tool actions.
9. **Plain language.** Explain jargon with a short tooltip or help text; error messages say what happened, what it means, and what to do.
10. **Lists.** Long lists are virtualized; tables have sticky headers where useful.
11. **Fonts and assets** are self-hosted; no third-party requests at runtime.

Before reporting done, run the automated accessibility check and the visual check against the mock (screenshot) and paste the output.
