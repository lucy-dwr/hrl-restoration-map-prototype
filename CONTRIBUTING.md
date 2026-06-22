# Contributing

Thank you for your interest in contributing to `hrl-restoration-map-prototype`.
This repository is an in-development prototype for the Healthy Rivers and
Landscapes restoration map. It is not an authoritative State of California
product, official public record, regulatory filing, or source of legal or policy
guidance.

## Code of Conduct

All contributors are expected to follow the project
[Code of Conduct](CODE_OF_CONDUCT.md).

## Before You Start

Read [SPEC.md](SPEC.md) before proposing or writing code. Treat the Decision Log
in that file as canonical. Do not reverse a logged decision without proposing a
superseding entry.

This prototype currently runs locally from generated static data in
`public/data/`. Do not assume Azure Blob, published snapshot manifests, or the
production `hrl-data-infrastructure` serving contract exist yet.

## Development Setup

This project uses React, Vite, TypeScript, MapLibre GL JS, and pnpm.

```sh
pnpm install
pnpm run dev
```

Useful checks:

```sh
pnpm run build
```

## Data Workflow

The browser app should not load source GeoPackage files directly. Use the
repeatable prototype workflow instead:

1. Put source GeoPackage files under `data/source/`.
2. Run `python scripts/convert-gpkg.py` to generate
   `public/data/hrl_restoration_projects.geojson`,
   `public/data/hrl_restoration_projects.gpkg`, and
   `public/data/hrl_restoration_projects.csv`.
3. Run `python scripts/fetch-watershed.py` to generate
   `public/data/sacramento-watershed.geojson`,
   `public/data/mokelumne-watershed.geojson`, and
   `public/data/tuolumne-watershed.geojson`.
4. Run `python scripts/fetch-delta-boundary.py` to generate
   `public/data/delta-boundary.geojson`.
5. Run `python scripts/fetch-bypass-boundaries.py` to generate
   `public/data/yolo-bypass-boundary.geojson` and
   `public/data/sutter-bypass-boundary.geojson`.
6. Run `python scripts/fetch-streams.py` to generate
   `public/data/streams.pmtiles`.
7. Keep generated files replaceable by re-running the scripts.

Normalize and validate project data against the vendored LinkML
`RestorationProjectSubmission` schema in
`schemas/hrl/linkml/hrl_restoration_project.yaml`.

Do not require fields that only exist on `RestorationProjectCanonicalRecord`
until the production validation and ingestion pipeline exists.

## Privacy and Public Data

Some source fields are not approved for public display in the prototype. Do not
render or expose these fields without explicit approval:

- `contact_name`
- `contact_email`
- `funding_secured`
- `funding_gap`
- `estimated_budget_comments`
- `construction_completion_year_comments`
- source submission metadata such as `source_slug`, `source_agency`,
  `submission_version`, `source_file`, and `source_feature_number`

Map data must align with the schema provided in `schemas/hrl/linkml/hrl_restoration_project.yaml`.

## Coding Standards

- Use TypeScript in strict mode.
- Use two-space indentation and rely on Prettier formatting.
- Use explicit imports for React components.
- Do not use `any`; prefer `unknown` and narrow the type.
- Keep files and directories in `kebab-case`, except React component files,
  which may use `PascalCase`.
- Use CSS modules or vanilla-extract. Do not add runtime CSS-in-JS.
- Prefer existing design tokens in `src/styles/tokens.css`.
- Preserve WCAG 2.2 Level AA accessibility as a baseline.

## Pull Requests

For pull requests, please include:

- A clear summary of the change.
- Any relevant issue or decision-log context.
- Screenshots or screen recordings for visible UI changes.
- Notes about data regeneration, if generated files changed.
- Verification steps, including commands run.
- Any accessibility considerations for user-facing changes.

Keep pull requests focused. Avoid unrelated refactors unless they are necessary
for the change being proposed.

## Issues

When opening an issue, include enough context for maintainers to reproduce or
evaluate it:

- What you expected to happen.
- What actually happened.
- Browser and operating system, for UI issues.
- Relevant project, layer, or data field, for map and data issues.
- Screenshots, URLs, or query parameters when useful.

For data issues, please distinguish between source-data problems, conversion
problems, and display problems when possible.
