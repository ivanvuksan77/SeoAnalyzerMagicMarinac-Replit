import "./_group.css";
import { Hero } from "./_Hero";

export function HeroHr() {
  return (
    <Hero
      lang="hr"
      brand="SiteSnap"
      eyebrow="Za Google Ads i organski SEO"
      h1Lead="Riješite probleme s Google"
      h1Accent="rangiranjem — brzo"
      sub="Pronađite probleme s odredišnom stranicom, Core Web Vitals greške i SEO propuste — sve poredano po utjecaju kako biste znali što popraviti prvo."
      cta="Pokrenite besplatnu analizu"
      trust={[
        "Besplatno · Bez registracije",
        "Rezultati za 30 sekundi",
        "8 alata u jednom izvješću",
      ]}
      proofTitle="Primjer Pro izvješća"
      reportLabel="PRO IZVJEŠĆE · €29"
      reportSite="walden-plants.hr"
      reportSubtitle="Svi podaci + prioritizirane upute za popravak"
      overall="UKUPNO"
      issuesFound="Pronađeni glavni problemi"
      issues={[
        { sev: "fail", title: "Nedostaje meta opis", note: "Početna stranica" },
        { sev: "warn", title: "LCP 4.2s — sporo", note: "Core Web Vitals" },
        { sev: "fail", title: "Nema praćenja konverzija", note: "Google Ads LP" },
        { sev: "warn", title: "12 slika preko 500KB", note: "Optimizacija slika" },
      ]}
      tools={[
        { label: "SEO", score: 79 },
        { label: "Ads LP", score: 64 },
        { label: "AEO", score: 58 },
        { label: "Brzina", score: 51 },
      ]}
      fixesLabel="Prioritizirani popravci"
    />
  );
}
