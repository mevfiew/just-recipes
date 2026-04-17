# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-04-17

### Added
- Detect recipes on any page that exposes `@type: "Recipe"` JSON-LD markup (most major food blogs). Confirmed working on BBC Good Food, AllRecipes, and thousands of other sites using schema.org.
- One-click save from the popup. Saved recipes are normalized: name, ingredients, instructions, times, yield, cuisine, category, author, image.
- Flattens `HowToSection` and `HowToStep` nested instructions into a flat numbered list.
- Parses ISO 8601 duration fields (e.g., `PT1H30M` → 90 minutes).
- Clean reader view (`src/viewer.html`) with serif typography, no ads, no SEO filler, print-friendly CSS.
- Search across saved recipes by name, ingredient, cuisine, category, author, keyword.
- Export all saved recipes as JSON.
- `activeTab` + `scripting` permissions only — no host permissions, no background fetches.

### Known limitations
- Sites that render JSON-LD client-side after page load may not be detected in v1.0.0 (the extension reads the DOM once when the popup opens). v1.1 could retry after a short delay.
- Pages without structured product markup (e.g., free-form blog posts, social media) are out of scope.

[1.0.0]: https://github.com/mevfiew/just-recipes/releases/tag/v1.0.0
