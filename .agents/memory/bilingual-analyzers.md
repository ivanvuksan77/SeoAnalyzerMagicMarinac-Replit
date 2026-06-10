---
name: Bilingual analyzer pattern
description: How EN/HR translations are wired through all analyzer services
---

## Pattern
Each analyzer class has:
```ts
private lang: string = 'en';
private L(en: string, hr: string): string { return this.lang === 'hr' ? hr : en; }
```
The public method signature accepts `lang: string = 'en'` and sets `this.lang = lang` at the top.

## Scope rule
- Translate: `name`, `details`, `impact`, `recommendation` in checks; `title`, `description`, `impact`, `actionItems` in recommendations; `summary`, `recommendations`, `issues` in siteTools.
- **Never translate** `technicalFix` fields — they contain code snippets intended for developers regardless of language.

## Dynamic strings with variables
Use ternary: `this.lang === 'hr' ? \`HR ${var}\` : \`EN ${var}\``

## Files covered
- `server/services/seoAnalyzer.ts` — fully translated (reference impl)
- `server/services/adsAnalyzer.ts` — checks + generateRecommendations
- `server/services/aeoAnalyzer.ts` — checks + generateRecommendations
- `server/services/geoAnalyzer.ts` — checks + generateRecommendations
- `server/services/siteTools.ts` — all 4 public methods

**Why:** Croatian is the second supported UI language. `lang` flows from the i18n language toggle → API payload → routes.ts → analyzer `lang` param. Each call regenerates fresh translated strings — no caching of language-specific results.
