import * as cheerio from "cheerio";
import { safeFetchHtml } from "./httpClient";
import type { AdRelevanceResult, AdRelevanceTermResult } from "@shared/schema";

const CROATIAN_DIACRITIC_MAP: Record<string, string> = {
  č: "c", ć: "c", š: "s", ž: "z", đ: "d",
  Č: "c", Ć: "c", Š: "s", Ž: "z", Đ: "d",
};

function normalize(text: string): string {
  return (text || "")
    .replace(/[čćšžđČĆŠŽĐ]/g, (ch) => CROATIAN_DIACRITIC_MAP[ch] || ch)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string): string[] {
  if (!input) return [];
  // Split on commas, semicolons, pipes, or newlines so users can paste multiple terms
  // per line. Each "term" can still be a multi-word phrase.
  return input
    .split(/[\n;|]|,(?=\s)/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const found = haystack.indexOf(needle, idx);
    if (found === -1) break;
    count++;
    idx = found + needle.length;
  }
  return count;
}

interface PageSurfaces {
  title: string;
  h1: string;
  subheadings: string;
  firstParagraph: string;
  altText: string;
  body: string;
}

function extractSurfaces(html: string): PageSurfaces {
  const $ = cheerio.load(html);
  $("script, style, noscript, template").remove();

  const title = $("title").first().text() || "";
  const h1 = $("h1").map((_, el) => $(el).text()).get().join(" \n ") || "";
  const subheadings = $("h2, h3").map((_, el) => $(el).text()).get().join(" \n ") || "";

  // First paragraph approximation: first <p> with >40 chars inside main/article/body
  let firstParagraph = "";
  $("main p, article p, body p").each((_, el) => {
    const txt = $(el).text().trim();
    if (txt.length >= 40 && !firstParagraph) {
      firstParagraph = txt;
    }
  });

  const altText = $("img[alt]").map((_, el) => $(el).attr("alt") || "").get().join(" \n ");

  // Body text — strip tags, collapse whitespace
  const body = $("body").text().replace(/\s+/g, " ").trim();

  return { title, h1, subheadings, firstParagraph, altText, body };
}

function analyzeTerm(rawTerm: string, surfaces: PageSurfaces): AdRelevanceTermResult {
  const term = normalize(rawTerm);
  const ns = {
    title: normalize(surfaces.title),
    h1: normalize(surfaces.h1),
    sub: normalize(surfaces.subheadings),
    firstP: normalize(surfaces.firstParagraph),
    alt: normalize(surfaces.altText),
    body: normalize(surfaces.body),
  };
  return {
    term: rawTerm.trim(),
    inTitle: countOccurrences(ns.title, term) > 0,
    inH1: countOccurrences(ns.h1, term) > 0,
    inSubheadings: countOccurrences(ns.sub, term) > 0,
    inFirstParagraph: countOccurrences(ns.firstP, term) > 0,
    inAltText: countOccurrences(ns.alt, term) > 0,
    inBody: countOccurrences(ns.body, term) > 0,
    occurrences: countOccurrences(ns.body, term),
  };
}

function scoreTerm(t: AdRelevanceTermResult): number {
  // Weighted: title 20, h1 25, subheading 15, firstP 20, alt 5, body 15
  let s = 0;
  if (t.inTitle) s += 20;
  if (t.inH1) s += 25;
  if (t.inSubheadings) s += 15;
  if (t.inFirstParagraph) s += 20;
  if (t.inAltText) s += 5;
  if (t.inBody) s += 15;
  return Math.min(100, s);
}

async function fetchHtml(url: string): Promise<string> {
  return safeFetchHtml(url, { timeoutMs: 15_000 });
}

const RECO_STRINGS = {
  en: {
    missingFromBody: (n: number, list: string) =>
      `${n} ad term(s) do not appear anywhere on the page: ${list}. Add them or rethink the ad copy.`,
    missingFromH1: (list: string) =>
      `Ad headlines should ideally be echoed in the page H1. Missing from H1: ${list}.`,
    missingFromFirstP: (list: string) =>
      `Bidded keywords should appear in the first paragraph above the fold. Missing: ${list}.`,
    strongMatch:
      "Ad-to-page relevance looks strong. If Google Ads still rates Landing Page Experience as below average, the issue is likely field-data Core Web Vitals or post-click engagement, not message match.",
    noTerms: "Paste at least one ad headline, description, or bidded keyword to score relevance.",
  },
  hr: {
    missingFromBody: (n: number, list: string) =>
      `${n} pojam iz oglasa ne pojavljuje se nigdje na stranici: ${list}. Dodajte ih ili preispitajte tekst oglasa.`,
    missingFromH1: (list: string) =>
      `Naslovi oglasa idealno bi se trebali ponoviti u H1 stranice. Nedostaju u H1: ${list}.`,
    missingFromFirstP: (list: string) =>
      `Ključne riječi za koje licitirate trebale bi se pojaviti u prvom odlomku iznad pregiba. Nedostaju: ${list}.`,
    strongMatch:
      "Poklapanje oglasa i stranice izgleda snažno. Ako Google Ads i dalje ocjenjuje Landing Page Experience ispodprosječno, uzrok je vjerojatno stvarni Core Web Vitals ili angažman nakon klika, a ne poklapanje poruke.",
    noTerms: "Zalijepite barem jedan naslov, opis ili ključnu riječ kako biste ocijenili relevantnost.",
  },
} as const;

export async function analyzeAdRelevance(params: {
  url: string;
  headlines?: string;
  descriptions?: string;
  keywords?: string;
  lang?: "en" | "hr";
}): Promise<AdRelevanceResult> {
  const html = await fetchHtml(params.url);
  const surfaces = extractSurfaces(html);

  const headlineTerms = tokenize(params.headlines || "");
  const descriptionTerms = tokenize(params.descriptions || "");
  const keywordTerms = tokenize(params.keywords || "");

  const allTerms = [
    ...headlineTerms.map((t) => ({ raw: t, kind: "headline" as const })),
    ...descriptionTerms.map((t) => ({ raw: t, kind: "description" as const })),
    ...keywordTerms.map((t) => ({ raw: t, kind: "keyword" as const })),
  ];

  const seen = new Set<string>();
  const termResults: AdRelevanceTermResult[] = [];
  for (const t of allTerms) {
    const key = `${t.kind}:${normalize(t.raw)}`;
    if (seen.has(key) || normalize(t.raw).length < 2) continue;
    seen.add(key);
    const r = analyzeTerm(t.raw, surfaces);
    (r as any).kind = t.kind;
    termResults.push(r);
  }

  // Overall score: average of per-term scores, weighted by kind (keywords matter most)
  const weights: Record<string, number> = { keyword: 1.5, headline: 1.0, description: 0.7 };
  let totalScore = 0;
  let totalWeight = 0;
  let matched = 0;
  for (const t of termResults) {
    const w = weights[(t as any).kind] || 1;
    totalScore += scoreTerm(t) * w;
    totalWeight += 100 * w;
    if (t.inBody) matched++;
  }
  const overallScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
  const matchRate = termResults.length > 0 ? Math.round((matched / termResults.length) * 100) : 0;

  // Recommendations
  const lang: "en" | "hr" = params.lang === "hr" ? "hr" : "en";
  const S = RECO_STRINGS[lang];
  const recommendations: string[] = [];
  const missingFromH1 = termResults.filter((t) => !t.inH1 && (t as any).kind !== "description").map((t) => t.term);
  const missingFromBody = termResults.filter((t) => !t.inBody).map((t) => t.term);
  const missingFromFirstP = termResults.filter((t) => !t.inFirstParagraph && (t as any).kind === "keyword").map((t) => t.term);

  if (missingFromBody.length > 0) {
    const list = missingFromBody.slice(0, 5).join(", ") + (missingFromBody.length > 5 ? "…" : "");
    recommendations.push(S.missingFromBody(missingFromBody.length, list));
  }
  if (missingFromH1.length > 0) {
    const list = missingFromH1.slice(0, 3).join(", ") + (missingFromH1.length > 3 ? "…" : "");
    recommendations.push(S.missingFromH1(list));
  }
  if (missingFromFirstP.length > 0) {
    const list = missingFromFirstP.slice(0, 3).join(", ") + (missingFromFirstP.length > 3 ? "…" : "");
    recommendations.push(S.missingFromFirstP(list));
  }
  if (overallScore >= 75 && termResults.length > 0) {
    recommendations.push(S.strongMatch);
  }
  if (termResults.length === 0) {
    recommendations.push(S.noTerms);
  }

  return {
    url: params.url,
    pageTitle: surfaces.title.trim().slice(0, 200),
    pageH1: surfaces.h1.trim().slice(0, 200),
    overallScore,
    matchRate,
    terms: termResults,
    recommendations,
  };
}
