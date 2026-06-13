# Styling

Tailwind CSS v4 + SCSS (BEM) + Preline UI. Admin and public each have their own SCSS entry.

## Build pipeline

```bash
npm run build:css    # required after any SCSS change
npm run watch:css    # runs with npm run dev
```

```
scss/admin/main.scss  ──sass──►  .build/admin.css  ──┐
scss/app/main.scss    ──sass──►  .build/app.css    ──┤
css/index.css         ──postcss──►  dist/css/admin.css
css/app.css           ──postcss──►  dist/css/app.css
```

PostCSS plugins: `@tailwindcss/postcss`, `postcss-nesting`, `autoprefixer`.

## Directory layout

```
scss/
├── admin/          # Admin dashboard styles
│   ├── main.scss
│   ├── components/   # BEM blocks (atoms, molecules, organisms)
│   └── pages/
└── app/            # Public site styles
    └── main.scss

css/
├── index.css       # Admin PostCSS entry (imports Tailwind + theme + .build/admin.css)
├── app.css         # Public PostCSS entry
└── theme.css       # @theme tokens, Preline variants
```

## BEM + @apply

```scss
.card {
  @apply rounded-lg border border-grey-200 bg-white;

  &__title {
    @apply text-body-lg font-semibold;
  }

  &--highlight {
    @apply border-blue-500;
  }
}
```

Use `var(--color-grey-500)` for theme tokens — not `theme()`.

## Rules

- New admin components → `scss/admin/components/`
- New public components → `scss/app/`
- Border radius scale: `rounded-sm` 2.4px · `rounded-md` 4px · `rounded-lg` 8px · `rounded-xl` 16px
- Dark mode: `.dark` class on root; tokens overridden in `theme.css`
- Preline attributes in templates; variants imported via `preline/variants.css`

## Common mistake

SCSS changes not showing? Run `npm run build:css` — the server serves compiled files from `dist/css/`.
