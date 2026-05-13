import { useEffect } from "react";
import i18n from "@/i18n";

export const SITE_ORIGIN = "https://sitesnap.eu";

export type SeoOptions = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  ogImage?: string;
};

const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

function upsertMeta(selector: string, attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const sel = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(sel);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (hreflang) el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function withoutLangParam(path: string): string {
  const [base, query = ""] = path.split("?");
  if (!query) return base;
  const params = new URLSearchParams(query);
  params.delete("lang");
  const remaining = params.toString();
  return remaining ? `${base}?${remaining}` : base;
}

function withLang(path: string, lang: "en" | "hr"): string {
  const clean = withoutLangParam(path);
  if (lang === "en") return clean;
  return clean.includes("?") ? `${clean}&lang=hr` : `${clean}?lang=hr`;
}

export function applySeo(opts: SeoOptions) {
  const lang: "en" | "hr" = (i18n.language || "en").toLowerCase().startsWith("hr") ? "hr" : "en";
  const enUrl = SITE_ORIGIN + withLang(opts.path, "en");
  const hrUrl = SITE_ORIGIN + withLang(opts.path, "hr");
  const canonicalUrl = lang === "hr" ? hrUrl : enUrl;

  document.title = opts.title;

  upsertMeta('meta[name="description"]', "name", "description", opts.description);
  upsertMeta('meta[name="robots"]', "name", "robots",
    opts.noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1");

  upsertLink("canonical", canonicalUrl);
  upsertLink("alternate", enUrl, "en");
  upsertLink("alternate", hrUrl, "hr");
  upsertLink("alternate", enUrl, "x-default");

  upsertMeta('meta[property="og:title"]', "property", "og:title", opts.title);
  upsertMeta('meta[property="og:description"]', "property", "og:description", opts.description);
  upsertMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
  upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
  upsertMeta('meta[property="og:locale"]', "property", "og:locale", lang === "hr" ? "hr_HR" : "en_US");
  upsertMeta('meta[property="og:locale:alternate"]', "property", "og:locale:alternate", lang === "hr" ? "en_US" : "hr_HR");
  upsertMeta('meta[property="og:image"]', "property", "og:image", opts.ogImage || DEFAULT_OG_IMAGE);
  upsertMeta('meta[property="og:image:type"]', "property", "og:image:type", "image/png");
  upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", opts.ogImage || DEFAULT_OG_IMAGE);

  upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", opts.title);
  upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", opts.description);
  upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
}

export function useSeo(opts: SeoOptions) {
  useEffect(() => {
    applySeo(opts);
    const handler = () => applySeo(opts);
    i18n.on("languageChanged", handler);
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, [opts.title, opts.description, opts.path, opts.noindex, opts.ogImage]);
}
