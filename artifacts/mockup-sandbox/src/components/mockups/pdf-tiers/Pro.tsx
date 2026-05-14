import "./_group.css";
import { CheckCircle2, XCircle, AlertCircle, Crown, Wrench, Code2, Search, Megaphone, Sparkles, Globe2, LinkIcon, Image as ImageIcon, Network, Map } from "lucide-react";

type Check = { s: "pass" | "warning" | "fail"; t: string; d: string; fix?: { title: string; steps: string[]; code?: string } };

const TOOLS: { name: string; color: string; score: number; icon: any; checks: Check[] }[] = [
  { name: "SEO Audit", color: "#3b82f6", score: 72, icon: Search, checks: [
    { s: "pass", t: "Title tag present", d: "\"Example Domain — Reliable hosting\" (54 chars)" },
    { s: "fail", t: "Meta description missing", d: "No <meta name=\"description\"> tag found on homepage",
      fix: { title: "Add a unique meta description (150–160 chars)", steps: [
        "Open client/index.html (or your homepage template)",
        "Inside <head>, add the tag below — keep it under 160 characters",
        "Mention the page's primary keyword and a clear value proposition",
      ], code: "<meta name=\"description\" content=\"Reliable, fast hosting for small businesses — 99.99% uptime, free SSL, EU data centers.\" />" } },
    { s: "warning", t: "H1 used twice", d: "Two <h1> elements found in main content",
      fix: { title: "Demote one of the duplicate H1s", steps: [
        "Inspect the page DOM and locate both <h1> elements",
        "Keep the one closest to the page title; convert the other to <h2>",
      ] } },
    { s: "warning", t: "Open Graph image missing", d: "og:image not set — link previews will be blank",
      fix: { title: "Add an og:image meta tag", steps: ["Generate a 1200x630 social card", "Reference it in <head>"], code: "<meta property=\"og:image\" content=\"https://example.com/social-card.png\" />" } },
  ]},
  { name: "Google Ads Landing Page", color: "#f59e0b", score: 64, icon: Megaphone, checks: [
    { s: "warning", t: "LCP 4.2s (slow)", d: "Largest Contentful Paint above the 2.5s good threshold",
      fix: { title: "Cut LCP under 2.5s", steps: [
        "Preload the hero image",
        "Convert hero.jpg → AVIF (saves ~70%)",
        "Lazy-load below-the-fold images",
      ], code: "<link rel=\"preload\" as=\"image\" href=\"/hero.avif\" fetchpriority=\"high\" />" } },
    { s: "fail", t: "No conversion tracking detected", d: "No GA4 / Google Ads conversion events found",
      fix: { title: "Install GA4 + Google Ads conversion event", steps: [
        "Add the GA4 tag to <head>",
        "Define a 'lead_submit' event on the form's success handler",
        "Link it to a Google Ads conversion in Tag Assistant",
      ] } },
  ]},
  { name: "AEO / AI SEO Readiness", color: "#8b5cf6", score: 58, icon: Sparkles, checks: [
    { s: "fail", t: "No FAQ schema", d: "AI assistants can't extract Q&A blocks for citation",
      fix: { title: "Add FAQPage JSON-LD", steps: ["Pick 3–5 questions your customers actually ask", "Drop the snippet inside <head>"],
        code: "{\n  \"@context\":\"https://schema.org\",\n  \"@type\":\"FAQPage\",\n  \"mainEntity\":[{\n    \"@type\":\"Question\",\"name\":\"Do you offer EU hosting?\",\n    \"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Yes, our data centers are in Frankfurt and Zagreb.\"}\n  }]\n}" } },
    { s: "warning", t: "Thin author bios", d: "Author E-E-A-T signals are missing on 3 pages",
      fix: { title: "Strengthen author bylines", steps: ["Add a 2-sentence bio + photo + LinkedIn link to each author page", "Reference the author from each article via Schema.org/Person"] } },
  ]},
  { name: "GEO / Generative Engine", color: "#14b8a6", score: 51, icon: Globe2, checks: [
    { s: "fail", t: "No LocalBusiness schema", d: "Generative engines can't surface your address / hours",
      fix: { title: "Add LocalBusiness JSON-LD", steps: ["Fill in your real NAP details", "Validate at validator.schema.org"],
        code: "{\"@context\":\"https://schema.org\",\"@type\":\"LocalBusiness\",\n \"name\":\"Example Hosting\",\"telephone\":\"+385 1 234 5678\",\n \"address\":{\"@type\":\"PostalAddress\",\"streetAddress\":\"Ilica 10\",\"addressLocality\":\"Zagreb\",\"postalCode\":\"10000\",\"addressCountry\":\"HR\"}}" } },
  ]},
  { name: "Broken Link Check", color: "#ef4444", score: 88, icon: LinkIcon, checks: [
    { s: "warning", t: "2 external links 404", d: "/blog/post-a → twitter.com/legacy (404)",
      fix: { title: "Update or remove dead outbound links", steps: ["Replace dead targets with the current canonical URL", "If no replacement exists, remove the link rather than leave the 404"] } },
  ]},
  { name: "Image Optimization", color: "#10b981", score: 79, icon: ImageIcon, checks: [
    { s: "fail", t: "12 images over 500KB", d: "hero.jpg: 1.4MB, gallery-3.png: 980KB ...",
      fix: { title: "Convert oversized images to AVIF/WebP", steps: ["Run the snippet on the public/images folder", "Reference responsive sources via <picture>"],
        code: "for f in public/images/*.{jpg,png}; do\n  cwebp -q 80 \"$f\" -o \"${f%.*}.webp\"\n  avifenc --min 28 --max 36 \"$f\" \"${f%.*}.avif\"\ndone" } },
    { s: "warning", t: "8 images missing alt text", d: "Accessibility + SEO impact",
      fix: { title: "Add descriptive alt text", steps: ["Describe what the image shows in 8–12 words", "Avoid 'image of' / 'photo of' phrasing"] } },
  ]},
  { name: "Internal Linking", color: "#06b6d4", score: 67, icon: Network, checks: [
    { s: "warning", t: "3 orphan pages found", d: "/services/legacy is not linked from anywhere",
      fix: { title: "Link orphan pages from a hub", steps: ["Add a contextual link from a related, well-ranking page", "If the page is obsolete, 301-redirect it instead"] } },
  ]},
  { name: "Sitemap & Robots.txt", color: "#ec4899", score: 92, icon: Map, checks: [
    { s: "pass", t: "sitemap.xml found", d: "https://example.com/sitemap.xml — 47 URLs" },
    { s: "pass", t: "robots.txt valid",  d: "Sitemap directive present" },
  ]},
];

function ScoreCircle({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 22; const c = 2 * Math.PI * r; const dash = (score / 100) * c;
  return (
    <div className="flex flex-col items-center" style={{ width: 64 }}>
      <div className="relative" style={{ width: 56, height: 56 }}>
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} stroke="#e2e8f0" strokeWidth="5" fill="none" />
          <circle cx="28" cy="28" r={r} stroke={color} strokeWidth="5" fill="none"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 28 28)" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold">{score}</div>
      </div>
      <div className="text-[8px] text-center mt-1 leading-tight" style={{ color: "#475569" }}>{label}</div>
    </div>
  );
}
function SevPill({ s }: { s: string }) {
  if (s === "fail")    return <span className="pill" style={{ background: "#fee2e2", color: "#b91c1c" }}><XCircle size={10}/>FAIL</span>;
  if (s === "warning") return <span className="pill" style={{ background: "#fef3c7", color: "#b45309" }}><AlertCircle size={10}/>WARN</span>;
  return <span className="pill" style={{ background: "#dcfce7", color: "#166534" }}><CheckCircle2 size={10}/>PASS</span>;
}

export function Pro() {
  const avg = Math.round(TOOLS.reduce((s, t) => s + t.score, 0) / TOOLS.length);
  return (
    <div className="pdf-page">
      <div className="rounded-xl p-4 mb-4" style={{ background: "linear-gradient(135deg,#7c3aed 0%,#db2777 100%)", color: "white" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest opacity-90">
              <Crown size={11} /> FreeSEOSiteAnalyzer · Pro Report · €29
            </div>
            <div className="text-lg font-bold mt-0.5">example.com</div>
            <div className="text-[10px] opacity-90 mt-0.5">Generated 02 May 2026 · Full data + prioritized fix instructions</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase opacity-80">Overall</div>
            <div className="text-3xl font-extrabold leading-none">{avg}<span className="text-base">/100</span></div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-bold">Overall Score Dashboard</h3>
          <span className="muted text-[10px]">8 tools · Full data + fixes</span>
        </div>
        <div className="flex flex-wrap justify-between gap-y-2">
          {TOOLS.map(t => <ScoreCircle key={t.name} score={t.score} color={t.color} label={t.name} />)}
        </div>
      </div>

      {TOOLS.map(t => {
        const Icon = t.icon;
        const passes = t.checks.filter(c => c.s === "pass").length;
        const fails  = t.checks.filter(c => c.s === "fail").length;
        const warns  = t.checks.filter(c => c.s === "warning").length;
        return (
          <div key={t.name} className="section-card">
            <div className="section-head">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: t.color + "20" }}>
                <Icon size={12} color={t.color} />
              </div>
              <div className="flex-1 font-semibold text-[11px]">{t.name}</div>
              <span className="text-[9px] muted">{passes} pass · {warns} warn · {fails} fail</span>
              <span className="pill" style={{ background: t.color + "15", color: t.color }}>Score {t.score}</span>
            </div>
            {t.checks.map((c, i) => (
              <div key={i}>
                <div className="check-row">
                  <SevPill s={c.s} />
                  <div className="flex-1">
                    <div className="font-semibold">{c.t}</div>
                    <div className="muted">{c.d}</div>
                  </div>
                </div>
                {c.fix && (
                  <div style={{ background: "#faf5ff", borderLeft: "3px solid #a855f7", padding: "8px 14px 10px", marginBottom: 0 }}>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "#6b21a8" }}>
                      <Wrench size={11} /> Fix: {c.fix.title}
                    </div>
                    <ol className="list-decimal pl-4 mt-1 text-[10px] space-y-0.5" style={{ color: "#581c87" }}>
                      {c.fix.steps.map((step, idx) => <li key={idx}>{step}</li>)}
                    </ol>
                    {c.fix.code && (
                      <pre style={{
                        background: "#1e1b4b", color: "#e9d5ff",
                        padding: "8px 10px", borderRadius: 6, marginTop: 6,
                        fontSize: 9, lineHeight: 1.4,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        <div className="flex items-center gap-1 mb-1 text-[8px] uppercase tracking-wider opacity-70">
                          <Code2 size={9}/> snippet
                        </div>
                        {c.fix.code}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
