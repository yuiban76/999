# Life Online — City Pulse Design System

## Product thesis

Life Online is a social urban-life simulation for phone and desktop. The interface has one job: help a player understand their condition and choose the next meaningful action without losing the feeling of living inside a shared city.

## Visual direction

**Concept:** city transit wayfinding × personal life control desk.

The signature is a station-line location navigator. It turns movement through the city into a recognizable visual language and keeps the current place obvious. The rest of the interface stays restrained so dense game information remains usable.

### Palette

| Token | Light | Dark | Purpose |
|---|---|---|---|
| Night ink | `#10212E` | `#F4F8FB` | Primary text |
| City fog | `#EEF3F6` | `#0A1219` | Page background |
| Station blue | `#087EA4` | `#5AC8E8` | Navigation and primary actions |
| Ticket amber | `#F4A340` | `#FFC66D` | Time, urgency and highlights |
| Civic jade | `#258A67` | `#5FD6AA` | Health, success and cooperation |
| Alert coral | `#C84E4E` | `#FF8B83` | Debt, illness and danger |

### Typography

- Interface and body: system sans with `PingFang TC`, `Noto Sans TC`, and `Microsoft JhengHei` fallbacks.
- Narrative titles only: `Noto Serif TC` / `Songti TC`.
- Time, money and compact data: `SFMono-Regular`, `Cascadia Mono`, and `Consolas`, with tabular figures.
- Mobile body text is never below 14px; primary controls are at least 44px tall.

### Layout

Desktop uses three explicit zones: sticky personal status, city action surface, and shared-world activity. Tablet uses personal status plus city, with the shared world below. Phone uses three bottom tabs—City, My Life, Multiplayer—so the primary action is never buried beneath long status panels.

### Surfaces and shape

- 8px spacing rhythm.
- 14–22px radii; compact status chips may use a pill.
- Shadows are quiet and directional; borders carry most hierarchy.
- Blur is reserved for modals and the sticky mobile navigation.

### Motion

- 160ms press and hover feedback; 260ms panel state transitions.
- Transform and opacity only. No layout-shifting hover effects.
- All nonessential motion is removed under `prefers-reduced-motion`.

## Interaction rules

- Every touch target is at least 44×44px with 8px spacing.
- Keyboard focus uses a visible 3px station-blue ring.
- Disabled controls retain readable labels and show reduced emphasis.
- Color is never the only status signal; labels remain visible.
- Mobile content reserves space for the bottom navigation and device safe area.
- Long labels wrap; user names and prices use shrinkable containers.

## Avoid

- Generic glass cards everywhere.
- Decorative gradients unrelated to city navigation.
- Emoji as navigation icons.
- Tiny uppercase captions as the only explanation.
- A single endless mobile page containing all three information zones.
