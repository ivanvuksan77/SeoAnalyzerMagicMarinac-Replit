import type { CruxFieldData, FieldDataMetric } from "@shared/schema";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const FETCH_TIMEOUT_MS = 18_000;

const NONE_METRIC: FieldDataMetric = { percentile: null, category: "NONE" };

function emptyResult(source: CruxFieldData["source"], error?: string): CruxFieldData {
  return {
    source,
    overall: null,
    lcp: NONE_METRIC,
    cls: NONE_METRIC,
    inp: NONE_METRIC,
    fcp: NONE_METRIC,
    ttfb: NONE_METRIC,
    fetchedAt: Date.now(),
    error,
  };
}

function mapMetric(raw: any): FieldDataMetric {
  if (!raw || typeof raw.percentile !== "number") return NONE_METRIC;
  const cat = (raw.category || "").toUpperCase();
  const category: FieldDataMetric["category"] =
    cat === "FAST" ? "FAST" : cat === "AVERAGE" ? "AVERAGE" : cat === "SLOW" ? "SLOW" : "NONE";
  return { percentile: raw.percentile, category };
}

function extractMetrics(experience: any): Omit<CruxFieldData, "source" | "fetchedAt" | "error"> {
  const m = experience?.metrics || {};
  const overallRaw = (experience?.overall_category || "").toUpperCase();
  const overall: CruxFieldData["overall"] =
    overallRaw === "FAST" ? "FAST" : overallRaw === "AVERAGE" ? "AVERAGE" : overallRaw === "SLOW" ? "SLOW" : null;
  return {
    overall,
    lcp: mapMetric(m.LARGEST_CONTENTFUL_PAINT_MS),
    cls: mapMetric(m.CUMULATIVE_LAYOUT_SHIFT_SCORE),
    // INP first; fall back to legacy FID for older datasets
    inp: mapMetric(m.INTERACTION_TO_NEXT_PAINT || m.FIRST_INPUT_DELAY_MS),
    fcp: mapMetric(m.FIRST_CONTENTFUL_PAINT_MS),
    ttfb: mapMetric(m.EXPERIMENTAL_TIME_TO_FIRST_BYTE),
  };
}

export async function fetchCruxFieldData(url: string): Promise<CruxFieldData> {
  const apiKey = (process.env.PAGESPEED_API_KEY || "").trim();
  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
  });
  if (apiKey) params.set("key", apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return emptyResult("none", `PSI HTTP ${res.status}`);
    }
    const json: any = await res.json();
    if (json?.error) {
      return emptyResult("none", json.error.message || "PSI error");
    }

    const urlExp = json.loadingExperience;
    if (urlExp && urlExp.metrics && Object.keys(urlExp.metrics).length > 0) {
      return { source: "url", ...extractMetrics(urlExp), fetchedAt: Date.now() };
    }
    const originExp = json.originLoadingExperience;
    if (originExp && originExp.metrics && Object.keys(originExp.metrics).length > 0) {
      return { source: "origin", ...extractMetrics(originExp), fetchedAt: Date.now() };
    }
    return emptyResult("none", "No CrUX field data available for this URL or origin");
  } catch (err: any) {
    clearTimeout(timer);
    const msg = err?.name === "AbortError" ? "PSI request timed out" : err?.message || "PSI request failed";
    return emptyResult("none", msg);
  }
}
