import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hr from "./locales/hr.json";

function detectInitialLang(): "en" | "hr" {
  if (typeof window === "undefined") return "en";
  try {
    const urlLang = new URLSearchParams(window.location.search).get("lang");
    if (urlLang && urlLang.toLowerCase().startsWith("hr")) return "hr";
    if (urlLang && urlLang.toLowerCase().startsWith("en")) return "en";
  } catch { /* noop */ }
  const saved = localStorage.getItem("lang");
  if (saved && saved.toLowerCase().startsWith("hr")) return "hr";
  return "en";
}

const initialLang = detectInitialLang();

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hr: { translation: hr } },
  lng: initialLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

function syncHtmlLang(lng: string) {
  if (typeof document === "undefined") return;
  const lang = lng?.toLowerCase().startsWith("hr") ? "hr" : "en";
  document.documentElement.setAttribute("lang", lang);
  function upsert(property: string, content: string) {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", property);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }
  upsert("og:locale", lang === "hr" ? "hr_HR" : "en_US");
  upsert("og:locale:alternate", lang === "hr" ? "en_US" : "hr_HR");
}

if (typeof window !== "undefined") {
  syncHtmlLang(initialLang);
  try { localStorage.setItem("lang", initialLang); } catch { /* noop */ }
}

i18n.on("languageChanged", (lng) => {
  try { localStorage.setItem("lang", lng); } catch { /* noop */ }
  syncHtmlLang(lng);
});

export default i18n;
