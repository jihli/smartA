# CODEX.md — Frontend UI Refactor Rules

## Core Goal

You are responsible for refactoring the frontend UI with high visual quality.

Do not change business logic, API behavior, authentication flow, database logic, or backend code unless explicitly requested.

Your main task is to improve layout, visual hierarchy, spacing, typography, colors, responsiveness, and component structure.

---

## Always Do First

Before editing frontend code:

1. Inspect the project structure.
2. Identify the frontend framework:
   - React
   - Next.js
   - Vue
   - Vite
   - plain HTML/CSS
   - other
3. Identify the main UI entry points:
   - pages
   - components
   - layouts
   - styles
   - Tailwind config
   - global CSS
4. Check whether the project already uses:
   - Tailwind CSS
   - CSS Modules
   - styled-components
   - shadcn/ui
   - Material UI
   - Ant Design
   - Bootstrap
   - custom CSS
5. Do not introduce a new UI library unless the user explicitly asks.

---

## Reference Images

If reference images are provided:

1. Match the reference as closely as possible.
2. Focus on:
   - layout
   - spacing
   - typography
   - colors
   - border radius
   - shadows
   - card proportions
   - image sizes
   - navigation structure
   - button styles
   - mobile layout
3. Do not add extra sections or features not present in the current app or reference.
4. Do not “improve” the reference design unless the user asks.
5. Preserve the existing app functionality.

If no reference image is provided:

1. Design a modern, polished interface from scratch.
2. Avoid generic Tailwind-looking UI.
3. Use a clear visual system:
   - consistent spacing
   - consistent colors
   - consistent radius
   - consistent shadows
   - consistent typography

---

## UI Refactor Scope

Allowed changes:

- Layout restructuring
- Component cleanup
- CSS / Tailwind class improvements
- Responsive design improvements
- Button, card, modal, form, table, sidebar, navbar styling
- Better visual hierarchy
- Better empty states
- Better loading states
- Better hover / active / focus states
- Extracting reusable UI components

Avoid unless explicitly requested:

- Backend changes
- Database changes
- API contract changes
- Authentication logic changes
- Payment logic changes
- Removing existing features
- Changing route behavior
- Rewriting the whole project

---

## Design Quality Rules

### Colors

- Do not use default Tailwind blue or indigo as the main brand color.
- Pick a custom brand color system if none exists.
- Use consistent semantic colors:
  - primary
  - secondary
  - background
  - surface
  - border
  - muted text
  - danger
  - success
  - warning

### Typography

- Use clear hierarchy:
  - page title
  - section title
  - card title
  - body text
  - caption text
- Large headings should use tight letter spacing.
- Body text should have comfortable line height.
- Avoid using the same size and weight everywhere.

### Spacing

- Use consistent spacing tokens.
- Avoid random padding and margin values.
- Prefer clear layout rhythm:
  - small: 8px
  - medium: 16px
  - large: 24px
  - section: 48px+

### Shadows and Depth

- Avoid generic `shadow-md` as the only depth system.
- Use subtle, layered shadows.
- Separate surfaces clearly:
  - page background
  - cards
  - floating elements
  - modals

### Borders and Radius

- Use consistent border radius across components.
- Cards, buttons, inputs, and modals should feel like one system.

### Interactions

Every clickable element should have:

- hover state
- focus-visible state
- active state

Do not use `transition-all`.

Prefer transitions on:

- transform
- opacity
- color
- background-color
- border-color
- box-shadow

### Responsive Design

The UI must work on:

- mobile
- tablet
- desktop

Use mobile-first responsive design where possible.

Do not create a beautiful desktop layout that breaks on mobile.

---

## Screenshot and Verification Workflow

After making UI changes:

1. Run the project locally using the existing project command.
2. If the project has a README, package.json, or documented dev command, follow it.
3. Open the app on localhost.
4. Take a screenshot if screenshot tooling is available.
5. Compare the result against the reference image if provided.
6. Fix visible mismatches.
7. Repeat at least once if visual comparison is possible.

When comparing screenshots, be specific:

- heading is too large
- card spacing is too tight
- button radius does not match
- sidebar width is wrong
- color is too saturated
- table row height is inconsistent
- mobile layout overflows

---

## Code Quality Rules

- Keep code readable.
- Prefer reusable components.
- Avoid deeply nested JSX.
- Remove obvious duplicate UI code.
- Keep naming clear and consistent.
- Do not leave unused imports.
- Do not leave dead code.
- Do not break TypeScript types.
- Do not ignore lint errors unless unavoidable.

---

## Framework-Specific Guidance

### React / Next.js

Prefer:

- reusable components
- layout components
- clear props
- semantic HTML
- accessible buttons and forms

Avoid:

- giant single components
- duplicated card/button styles
- hardcoded layout hacks

### Tailwind CSS

Prefer:

- consistent class patterns
- component extraction when repeated
- custom brand colors
- responsive utilities

Avoid:

- random one-off spacing
- default Tailwind blue/indigo as primary
- excessive arbitrary values
- `transition-all`

### Plain HTML / CSS

Prefer:

- semantic HTML
- CSS custom properties
- reusable class names
- responsive media queries

---

## Accessibility

Maintain basic accessibility:

- Buttons must be buttons.
- Links must be links.
- Inputs must have labels or accessible names.
- Focus states must be visible.
- Text contrast should be readable.
- Do not remove keyboard accessibility.

---

## Final Response Requirements

After finishing, summarize:

1. What UI areas were changed.
2. Which files were modified.
3. Whether logic/API behavior was preserved.
4. How to run or preview the app.
5. Any remaining limitations or recommended next steps.

Do not claim visual perfection unless screenshots were actually reviewed.
