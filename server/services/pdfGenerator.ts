import PDFDocument from "pdfkit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { SeoAnalysis } from "@shared/schema";

// Resolve the bundled fonts directory at module load time. We must NOT rely
// on `process.cwd()` because the server may be launched from any working
// directory (npm scripts, deployments, tests). And we cannot rely on a SINGLE
// `__dirname`-relative path because esbuild's bundle output (`dist/index.js`,
// per `npm run build`) collapses `server/services/pdfGenerator.ts` into the
// dist root, so the relative offset between this module and the fonts dir
// changes between dev (`tsx server/index.ts`) and production (`node dist/
// index.js`).
//
// Strategy: probe multiple deterministic candidate locations and pick the
// first one that contains the bundled Inter TTFs. If none match the loud
// console.warn in registerInterFonts will surface the failure in production
// logs and the fallback chain (DejaVu → Helvetica) takes over.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveFontDir(): string {
  const candidates = [
    // 1. tsx dev: server/services/pdfGenerator.ts → ../assets/fonts
    path.resolve(__dirname, '..', 'assets', 'fonts'),
    // 2. esbuild bundle: dist/index.js → ../server/assets/fonts (project root)
    path.resolve(__dirname, '..', 'server', 'assets', 'fonts'),
    // 3. esbuild bundle if fonts get copied alongside: dist/assets/fonts
    path.resolve(__dirname, 'assets', 'fonts'),
    // 4. Last resort: cwd-relative (works when started from project root)
    path.resolve(process.cwd(), 'server', 'assets', 'fonts'),
  ];
  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, 'Inter-Regular.ttf'))) return dir;
    } catch { /* continue */ }
  }
  // No match — return the first candidate; registerInterFonts will fall
  // through to DejaVu/Helvetica and emit a console.warn so this state is
  // observable in production logs.
  return candidates[0];
}

const FONT_DIR = resolveFontDir();

export async function generatePdfReport(analysis: SeoAnalysis): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 30,
        size: 'A4',
        info: {
          Title: `SEO Analysis Report - ${analysis.url}`,
          Author: 'SiteSnap',
          Subject: 'Website SEO Performance Analysis',
          Keywords: 'SEO, Analysis, Website Optimization, Performance'
        }
      });
      const buffers: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      try {
        registerInterFonts(doc);
      } catch {
        // Fall back silently if Inter fonts are unavailable.
      }

      // Web App Style Header - Primary Blue
      const headerHeight = 80;
      doc.rect(0, 0, doc.page.width, headerHeight).fill(colors.primary);
      
      // Logo area (matching web app)
      doc.circle(50, 25, 12).fill('white');
      doc.fillColor(colors.primary).fontSize(10).text('S', 46, 20);
      
      doc.fillColor('white')
         .fontSize(24)
         .font('BodyBold')
         .text('SiteSnap', 75, 20);
      
      doc.fontSize(12)
         .font('Body')
         .text(`Analysis Report for ${analysis.url}`, 75, 45);
      
      doc.fontSize(10)
         .text(`Generated ${new Date().toLocaleDateString('en-US', { 
           year: 'numeric', month: 'long', day: 'numeric' 
         })}`, doc.page.width - 150, 45);
      
      doc.fillColor(colors.foreground);
      doc.y = headerHeight + 20;

      // Overall Score Card (matching web app layout)
      createCard(doc, doc.y, 500, 100);
      
      // Progress ring (matching web app)
      const centerX = 80;
      const centerY = doc.y + 50;
      const radius = 35;
      
      // Background circle
      doc.circle(centerX, centerY, radius)
         .lineWidth(6)
         .strokeColor(colors.muted)
         .stroke();
      
      // Progress circle
      const circumference = 2 * Math.PI * radius;
      const progress = (analysis.overallScore / 100) * circumference;
      doc.circle(centerX, centerY, radius)
         .lineWidth(6)
         .strokeColor(getScoreColor(analysis.overallScore))
         .dash(progress, circumference - progress)
         .stroke();
      
      // Score text (matching web app)
      doc.fillColor(colors.foreground)
         .fontSize(28)
         .font('BodyBold')
         .text(`${analysis.overallScore}`, centerX - 18, centerY - 10);
      
      // Score description (matching web app)
      const performanceLevel = getPerformanceLevel(analysis.overallScore);
      doc.fontSize(20)
         .font('BodyBold')
         .text('Overall SEO Score', 140, centerY - 20);
      
      doc.fontSize(14)
         .fillColor(colors.mutedForeground)
         .font('Body')
         .text(performanceLevel.text, 140, centerY + 5);
      
      doc.fontSize(12)
         .text(analysis.url, 140, centerY + 25);
      
      doc.y = centerY + 70;

      // Category Cards Grid (matching web app design)
      doc.moveDown(1);
      const cardWidth = 160;
      const cardHeight = 120;
      const cardsPerRow = 3;
      const cardSpacing = 20;
      
      const categories = [
        { name: 'Technical SEO', score: analysis.technicalScore, icon: 'T', color: colors.blue, bgColor: colors.blueBg },
        { name: 'Performance', score: analysis.performanceScore, icon: 'P', color: colors.green, bgColor: colors.greenBg },
        { name: 'Accessibility', score: analysis.accessibilityScore, icon: 'A', color: colors.purple, bgColor: colors.purpleBg },
        { name: 'Keywords', score: analysis.keywordScore, icon: 'K', color: colors.orange, bgColor: colors.orangeBg },
        { name: 'Content Quality', score: analysis.contentScore, icon: 'C', color: colors.indigo, bgColor: colors.indigoBg }
      ];

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const row = Math.floor(i / cardsPerRow);
        const col = i % cardsPerRow;
        const x = 40 + col * (cardWidth + cardSpacing);
        const y = doc.y + row * (cardHeight + cardSpacing);
        
        // Card background (matching web app rounded-xl border shadow-sm)
        createCard(doc, y, cardWidth, cardHeight);
        
        // Icon background (matching web app bg-blue-100 etc)
        doc.circle(x + 20, y + 25, 15)
           .fillColor(category.bgColor)
           .fill();
           
        // Icon (matching web app icon colors)
        doc.fillColor(category.color)
           .fontSize(14)
           .text(category.icon, x + 15, y + 20);
        
        // Category name
        doc.fillColor(colors.foreground)
           .fontSize(14)
           .font('BodyBold')
           .text(category.name, x + 45, y + 15, { width: cardWidth - 55 });
        
        // Score (matching web app styling)
        doc.fontSize(32)
           .fillColor(getScoreColor(category.score))
           .font('BodyBold')
           .text(`${category.score}`, x + 45, y + 35);
           
        doc.fontSize(16)
           .fillColor(colors.mutedForeground)
           .font('Body')
           .text('/100', x + 85, y + 45);
           
        // Progress indicator (matching web app progress bars)
        const progressY = y + 75;
        const progressWidth = cardWidth - 25;
        const progressHeight = 4;
        const progressFill = (category.score / 100) * progressWidth;
        
        // Progress track (background)
        doc.rect(x + 12, progressY, progressWidth, progressHeight)
           .fillColor(colors.muted)
           .fill();
           
        // Progress fill
        doc.rect(x + 12, progressY, progressFill, progressHeight)
           .fillColor(getScoreColor(category.score))
           .fill();
      }
      
      doc.y += Math.ceil(categories.length / cardsPerRow) * (cardHeight + cardSpacing) + 20;

      // Detailed Analysis Sections
      const results = analysis.results as any;
      
      if (results) {
        try {
          // Technical SEO Analysis
          if (results.technical && Array.isArray(results.technical)) {
            createDetailedSection(doc, 'Technical SEO Analysis', '', results.technical);
          }
          
          // Performance Analysis  
          if (results.performance && Array.isArray(results.performance)) {
            createDetailedSection(doc, 'Performance Analysis', '', results.performance);
          }
          
          // Accessibility Analysis
          if (results.accessibility && Array.isArray(results.accessibility)) {
            createDetailedSection(doc, 'Accessibility Analysis', '', results.accessibility);
          }
          
          // Keywords Analysis (fixed data structure)
          if (results.keyword && typeof results.keyword === 'object') {
            // Convert keyword object to array format for consistency
            const keywordChecks = [
              {
                name: 'Meta Title',
                status: results.keyword.metaTitle?.present ? 'PASS' : 'FAIL',
                details: results.keyword.metaTitle?.present 
                  ? `Title length: ${results.keyword.metaTitle.length} characters`
                  : 'Missing meta title',
                priority: results.keyword.metaTitle?.present ? 'Excellent' : 'Critical',
                action: results.keyword.metaTitle?.present ? 'Perfect!' : 'Add Title'
              },
              {
                name: 'Meta Description',
                status: results.keyword.metaDescription?.present ? 'PASS' : 'FAIL',
                details: results.keyword.metaDescription?.present 
                  ? `Description length: ${results.keyword.metaDescription.length} characters`
                  : 'Missing meta description',
                priority: results.keyword.metaDescription?.present ? 'Excellent' : 'Critical',
                action: results.keyword.metaDescription?.present ? 'Perfect!' : 'Add Description'
              },
              {
                name: 'Heading Structure',
                status: results.keyword.headingStructure?.hierarchyValid ? 'PASS' : 'WARNING',
                details: `${results.keyword.headingStructure?.h1Count || 0} H1 tags found`,
                priority: results.keyword.headingStructure?.hierarchyValid ? 'Excellent' : 'Medium',
                action: results.keyword.headingStructure?.hierarchyValid ? 'Great!' : 'Fix Hierarchy'
              }
            ];
            createDetailedSection(doc, 'Keywords Analysis', '', keywordChecks);
          }
          
          // Content Quality Analysis (fixed data structure)
          if (results.content && typeof results.content === 'object') {
            // Convert content object to array format for consistency
            const contentChecks = [
              {
                name: 'Word Count',
                status: results.content.wordCount > 300 ? 'PASS' : 'WARNING',
                details: `Page contains ${results.content.wordCount} words`,
                priority: results.content.wordCount > 300 ? 'Excellent' : 'Medium',
                action: results.content.wordCount > 300 ? 'Great!' : 'Add Content'
              },
              {
                name: 'Image Alt Tags',
                status: results.content.imageAltTags?.percentage === 100 ? 'PASS' : 'WARNING',
                details: `${results.content.imageAltTags?.percentage || 0}% of images have alt tags`,
                priority: results.content.imageAltTags?.percentage === 100 ? 'Excellent' : 'Medium',
                action: results.content.imageAltTags?.percentage === 100 ? 'Perfect!' : 'Add Alt Tags'
              },
              {
                name: 'Structured Data',
                status: results.content.structuredData ? 'PASS' : 'WARNING',
                details: results.content.structuredData ? 'Structured data found' : 'No structured data detected',
                priority: results.content.structuredData ? 'Excellent' : 'Medium',
                action: results.content.structuredData ? 'Great!' : 'Add Schema'
              }
            ];
            createDetailedSection(doc, 'Content Quality Analysis', '', contentChecks);
          }
        } catch (sectionError) {
          // Continue with recommendations even if sections fail
        }
      }

      // Priority Recommendations Section (compact design)
      if (analysis.recommendations && Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0) {
        if (doc.y > 600) {
          doc.addPage();
          doc.y = 40;
        }
        
        createSectionHeader(doc, 'Priority Recommendations');
        
        analysis.recommendations.slice(0, 5).forEach((rec: any, index: number) => {
          if (doc.y > 720) {
            doc.addPage();
            doc.y = 40;
          }
          
          const recY = doc.y;
          const recHeight = 50;
          
          // Recommendation card (matching web app style)
          createCard(doc, recY, doc.page.width - 80, recHeight);
          
          // Priority indicator (left border)
          doc.rect(40, recY, 4, recHeight)
             .fillColor(getPriorityColor(rec.priority))
             .fill();
             
          // Recommendation content
          doc.fillColor(colors.foreground)
             .fontSize(12)
             .font('BodyBold')
             .text(`${index + 1}. ${rec.title}`, 55, recY + 10, { width: 350 });
             
          // Priority and category badges
          createBadge(doc, doc.page.width - 170, recY + 8, rec.priority, 
                     getPriorityColor(rec.priority), 
                     getPriorityBgColor(rec.priority));
                     
          createBadge(doc, doc.page.width - 110, recY + 8, rec.category || 'SEO', 
                     colors.primary, colors.background);
             
          // Description
          doc.fillColor(colors.mutedForeground)
             .fontSize(10)
             .font('Body')
             .text(rec.description, 55, recY + 28, { width: doc.page.width - 140 });
             
          doc.y = recY + recHeight + 8;
        });
      }

      // Enhanced Footer
      addFooter(doc, analysis.url);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function createCard(doc: InstanceType<typeof PDFDocument>, y: number, width: number, height: number) {
  // Card background with shadow (matching web app card styling)
  doc.rect(40, y, width, height)
     .fillColor(colors.card)
     .fill()
     .strokeColor(colors.border)
     .lineWidth(1)
     .stroke();
     
  // Subtle shadow effect
  doc.rect(42, y + 2, width, height)
     .fillColor(colors.shadow)
     .fillOpacity(0.05)
     .fill()
     .fillOpacity(1);
}

function createSectionHeader(doc: InstanceType<typeof PDFDocument>, title: string, _icon?: string) {
  ensureSpace(doc, 40);
  doc.fillColor(colors.primary)
     .fontSize(16)
     .font('BodyBold')
     .text(title, 40, doc.y, { width: doc.page.width - 80 });
  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y)
     .strokeColor(colors.border).lineWidth(1).stroke();
  doc.moveDown(0.4);
}

function createDetailedSection(
  doc: InstanceType<typeof PDFDocument>,
  title: string,
  _icon: string,
  checks: any[],
  L?: PdfLabels,
  omitImpact: boolean = false,
) {
  const labels = L || PDF_LABELS.en;
  createSectionHeader(doc, title);

  const passCount = checks.filter(c => c.status === 'PASS').length;
  const warningCount = checks.filter(c => c.status === 'WARNING').length;
  const failCount = checks.filter(c => c.status === 'FAIL').length;

  const statsY = doc.y;
  createBadge(doc, 40, statsY, `${checks.length} ${labels.totalLabel}`, colors.mutedForeground, colors.muted);
  createBadge(doc, 110, statsY, `${passCount} ${labels.passLabel}`, colors.green, colors.greenBg);
  createBadge(doc, 180, statsY, `${warningCount} ${labels.warningLabel}`, colors.orange, colors.orangeBg);
  createBadge(doc, 260, statsY, `${failCount} ${labels.failLabel}`, colors.red, colors.redBg);
  doc.y = statsY + 25;

  const contentW = doc.page.width - 80;
  const textAreaWidth = contentW - 100;

  checks.forEach((check) => {
    const detailStr = (check.details || '').substring(0, 150);
    const impactStr = omitImpact ? '' : (check.whyItMatters || '').substring(0, 200);

    doc.fontSize(9).font('Body');
    const detailH = doc.heightOfString(detailStr, { width: textAreaWidth });
    const nameH = 14;
    let rowH = nameH + detailH + 6;
    let impactH = 0;
    if (impactStr) {
      impactH = doc.heightOfString(impactStr, { width: contentW - 20 }) + 4;
      rowH += impactH;
    }
    rowH = Math.max(30, rowH);

    ensureSpace(doc, rowH + 4);
    const itemY = doc.y;

    doc.roundedRect(40, itemY, contentW, rowH, 6).fillColor(colors.background).fill();
    doc.roundedRect(40, itemY, contentW, rowH, 6).strokeColor(colors.border).lineWidth(0.5).stroke();

    doc.circle(55, itemY + 12, 4).fillColor(getStatusColor(check.status)).fill();

    doc.fillColor(colors.foreground).fontSize(10).font('BodyBold')
       .text(check.name || '', 68, itemY + 4, { width: textAreaWidth, lineBreak: false, ellipsis: true });

    const badgeX = doc.page.width - 120;
    drawSeverityPill(doc, badgeX, itemY + 6, check.status, labels);

    doc.fillColor(colors.mutedForeground).fontSize(9).font('Body')
       .text(detailStr, 68, itemY + nameH + 2, { width: textAreaWidth });

    if (impactStr) {
      const impactY = itemY + nameH + detailH + 6;
      doc.fillColor('#6b7280').fontSize(8).font('BodyItalic')
         .text(impactStr, 50, impactY, { width: contentW - 20 });
    }

    doc.y = itemY + rowH + 2;
  });
  doc.moveDown(0.5);
}

function createBadge(doc: InstanceType<typeof PDFDocument>, x: number, y: number, text: string, textColor: string, bgColor: string) {
  const padding = 6;
  doc.fontSize(8);
  const textWidth = doc.widthOfString(text);
  const badgeWidth = textWidth + padding * 2;
  
  // Badge background (rounded rectangle effect)
  doc.rect(x, y, badgeWidth, 16)
     .fillColor(bgColor)
     .fill();
     
  // Badge text
  doc.fillColor(textColor)
     .fontSize(8)
     .font('BodyBold')
     .text(text, x + padding, y + 4);
}

function getCheckCardHeight(check: any): number {
  let height = 50; // Base height
  if (check.action) height += 15;
  
  const guidance = getActionGuidance(check);
  if (guidance.action !== 'Great job! This check is passing.' && guidance.action !== 'Review and improve this aspect of your website.') {
    height += 30; // For guidance and resources
  }
  
  return height;
}

function getActionGuidance(check: any) {
  const guides = {
    "H1 Tags": {
      description: "H1 tags are crucial for SEO as they tell search engines what your page is about.",
      action: check.status === "PASS" ? "Perfect! Your page has exactly one H1 tag." : "Add a single, descriptive H1 tag to your page.",
      resources: ["https://moz.com/learn/seo/title-tag", "https://developers.google.com/web/fundamentals/design-and-ux/typography"]
    },
    "Meta Description": {
      description: "Meta descriptions appear in search results and influence click-through rates.",
      action: check.status === "PASS" ? "Great! Your meta description is properly set." : "Add a compelling meta description between 150-160 characters.",
      resources: ["https://moz.com/learn/seo/meta-description", "https://developers.google.com/search/docs/advanced/appearance/snippet"]
    },
    "Image Alt Tags": {
      description: "Alt tags help search engines understand your images and improve accessibility.",
      action: check.status === "PASS" ? "Excellent! Your images have proper alt tags." : "Add descriptive alt tags to all images.",
      resources: ["https://moz.com/learn/seo/alt-text", "https://www.w3.org/WAI/tutorials/images/"]
    },
    "Page Title": {
      description: "Page titles are one of the most important on-page SEO elements.",
      action: check.status === "PASS" ? "Excellent! Your page has a proper title." : "Add a descriptive, keyword-rich page title.",
      resources: ["https://moz.com/learn/seo/title-tag"]
    },
    "Robots.txt": {
      description: "Robots.txt file helps control search engine crawling behavior.",
      action: check.status === "PASS" ? "Perfect! Your robots.txt file is accessible." : "Create and configure a robots.txt file.",
      resources: ["https://developers.google.com/search/docs/advanced/robots/robots_txt"]
    }
  };
  
  return guides[check.name as keyof typeof guides] || {
    description: "This check helps improve your website's SEO performance.",
    action: check.status === "PASS" ? "Great job! This check is passing." : "Review and improve this aspect of your website.",
    resources: ["https://moz.com/learn/seo", "https://developers.google.com/search/docs"]
  };
}

function addFooter(doc: InstanceType<typeof PDFDocument>, url: string) {
  const footerY = doc.page.height - 40;
  
  // Simple footer line
  doc.moveTo(40, footerY)
     .lineTo(doc.page.width - 40, footerY)
     .strokeColor(colors.border)
     .lineWidth(1)
     .stroke();
     
  doc.fillColor(colors.mutedForeground)
     .fontSize(9)
     .font('Body')
     .text(`SiteSnap • ${url}`, 40, footerY + 10)
     .text(`Generated ${new Date().toLocaleDateString()}`, { align: 'right' });
}

function getPerformanceLevel(score: number) {
  if (score >= 90) return { text: 'Excellent', color: '#16a34a' };
  if (score >= 75) return { text: 'Good', color: '#059669' };
  if (score >= 60) return { text: 'Average', color: '#ca8a04' };
  if (score >= 40) return { text: 'Needs Improvement', color: '#ea580c' };
  return { text: 'Poor', color: '#dc2626' };
}

// Web App Color System (exact HSL to Hex conversion)
const colors = {
  // Primary colors
  primary: '#3b82f6',        // hsl(221.2, 83.2%, 53.3%)
  background: '#fafbff',     // hsl(210, 40%, 98%)
  card: '#ffffff',           // hsl(0, 0%, 100%)
  border: '#e2e8f0',         // hsl(214.3, 31.8%, 91.4%)
  foreground: '#0f172a',     // hsl(222.2, 84%, 4.9%)
  mutedForeground: '#64748b', // hsl(215.4, 16.3%, 46.9%)
  muted: '#f8fafc',          // hsl(210, 40%, 96%)
  shadow: '#000000',
  
  // Category colors (matching web app)
  blue: '#2563eb',           // Technical SEO
  blueBg: '#dbeafe',
  green: '#16a34a',          // Performance  
  greenBg: '#dcfce7',
  purple: '#9333ea',         // Accessibility
  purpleBg: '#f3e8ff',
  orange: '#ea580c',         // Keywords
  orangeBg: '#fed7aa',
  indigo: '#4f46e5',         // Content
  indigoBg: '#e0e7ff',
  
  // Status colors
  red: '#dc2626',
  redBg: '#fef2f2',
  yellow: '#ca8a04',
  yellowBg: '#fefce8'
};

function getScoreColor(score: number): string {
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.yellow;
  if (score >= 40) return colors.orange;
  return colors.red;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'PASS': return colors.green;
    case 'WARNING': return colors.orange;
    case 'FAIL': return colors.red;
    default: return colors.mutedForeground;
  }
}

function getStatusBgColor(status: string): string {
  switch (status) {
    case 'PASS': return colors.greenBg;
    case 'WARNING': return colors.orangeBg;
    case 'FAIL': return colors.redBg;
    default: return colors.muted;
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'Excellent': return colors.green;
    case 'Good': return colors.green;
    case 'Medium': return colors.yellow;
    case 'Critical': return colors.red;
    default: return colors.mutedForeground;
  }
}

function getPriorityBgColor(priority: string): string {
  switch (priority) {
    case 'Excellent': return colors.greenBg;
    case 'Good': return colors.greenBg;
    case 'Medium': return colors.yellowBg;
    case 'Critical': return colors.redBg;
    default: return colors.muted;
  }
}

interface MasterResult {
  url: string;
  seo: { data: any | null; error: string | null };
  ads: { data: any | null; error: string | null };
  aeo: { data: any | null; error: string | null };
  geo: { data: any | null; error: string | null };
  brokenLinks: { data: any | null; error: string | null };
  imageOptimization: { data: any | null; error: string | null };
  internalLinking: { data: any | null; error: string | null };
  sitemapValidator: { data: any | null; error: string | null };
}

function ensureSpace(doc: InstanceType<typeof PDFDocument>, needed: number) {
  if (doc.y + needed > doc.page.height - 60) {
    doc.addPage();
    doc.y = 40;
  }
}

function addMasterFooter(doc: InstanceType<typeof PDFDocument>, _url: string, pageLabelFn?: (n: number, t: number) => string) {
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  const fmt = pageLabelFn || ((n, t) => `Page ${n} of ${t}`);
  for (let i = range.start; i < range.start + totalPages; i++) {
    doc.switchToPage(i);
    const footerY = doc.page.height - 35;
    doc.moveTo(40, footerY - 5)
       .lineTo(doc.page.width - 40, footerY - 5)
       .strokeColor(colors.border)
       .lineWidth(0.5)
       .stroke();
    doc.y = footerY;
    doc.fillColor(colors.mutedForeground)
       .fontSize(8)
       .font('Body')
       .text(`SiteSnap`, 40, footerY, { lineBreak: false, continued: false });
    doc.y = footerY;
    doc.fillColor(colors.mutedForeground)
       .fontSize(8)
       .font('Body')
       .text(fmt(i + 1, totalPages), doc.page.width - 130, footerY, { lineBreak: false, continued: false });
    doc.y = footerY;
  }
  doc.switchToPage(range.start + totalPages - 1);
  doc.y = 50;
}

function drawScoreBox(doc: InstanceType<typeof PDFDocument>, x: number, y: number, width: number, label: string, score: number) {
  doc.rect(x, y, width, 50)
     .fillColor(colors.card)
     .fill()
     .strokeColor(colors.border)
     .lineWidth(0.5)
     .stroke();
  doc.fillColor(getScoreColor(score))
     .fontSize(22)
     .font('BodyBold')
     .text(`${score}`, x + 8, y + 6, { width: width - 16 });
  doc.fillColor(colors.mutedForeground)
     .fontSize(8)
     .font('Body')
     .text(label, x + 8, y + 32, { width: width - 16 });
}

function drawScoreCircle(doc: InstanceType<typeof PDFDocument>, cx: number, cy: number, radius: number, score: number, label: string, ringColor?: string) {
  const color = ringColor || getScoreColor(score);
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (score / 100) * 2 * Math.PI;

  doc.save();
  doc.circle(cx, cy, radius)
     .lineWidth(radius > 20 ? 6 : 4)
     .strokeColor(colors.border)
     .stroke();

  if (score > 0) {
    doc.save();
    doc.lineWidth(radius > 20 ? 6 : 4);
    doc.strokeColor(color);
    const segments = Math.max(1, Math.round((score / 100) * 60));
    const angleStep = (endAngle - startAngle) / segments;
    for (let i = 0; i < segments; i++) {
      const a1 = startAngle + i * angleStep;
      const a2 = startAngle + (i + 1) * angleStep;
      const x1 = cx + radius * Math.cos(a1);
      const y1 = cy + radius * Math.sin(a1);
      const x2 = cx + radius * Math.cos(a2);
      const y2 = cy + radius * Math.sin(a2);
      doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
    }
    doc.restore();
  }

  const fontSize = radius > 20 ? 14 : 10;
  doc.fillColor(colors.foreground)
     .fontSize(fontSize)
     .font('BodyBold');
  const scoreStr = `${score}`;
  const textW = doc.widthOfString(scoreStr);
  doc.text(scoreStr, cx - textW / 2, cy - fontSize / 2 - 1, { lineBreak: false });

  if (label) {
    doc.fillColor(colors.mutedForeground)
       .fontSize(radius > 20 ? 7 : 6)
       .font('Body');
    const labelW = doc.widthOfString(label);
    const maxLabelW = radius * 2 + 10;
    if (labelW > maxLabelW) {
      doc.text(label, cx - maxLabelW / 2, cy + radius + 6, { width: maxLabelW, align: 'center' });
    } else {
      doc.text(label, cx - labelW / 2, cy + radius + 6, { lineBreak: false });
    }
  }
  doc.restore();
}

function drawRecommendations(doc: InstanceType<typeof PDFDocument>, recommendations: any[]) {
  if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) return;
  ensureSpace(doc, 50);
  doc.fillColor(colors.foreground).fontSize(11).font('BodyBold').text('Recommendations', 50, doc.y);
  doc.moveDown(0.3);
  recommendations.slice(0, 5).forEach((rec: any, i: number) => {
    const text = typeof rec === 'string' ? rec : (rec.title || rec.description || JSON.stringify(rec));
    const cleanText = text.substring(0, 200);
    const priority = typeof rec === 'object' && rec.priority ? rec.priority : '';
    doc.fontSize(9).font('Body');
    const textH = doc.heightOfString(`${i + 1}. ${cleanText}`, { width: doc.page.width - 150 });
    const rowH = Math.max(22, textH + 10);
    ensureSpace(doc, rowH + 4);
    const y = doc.y;
    doc.rect(50, y, doc.page.width - 100, rowH)
       .fillColor(i % 2 === 0 ? colors.background : colors.card)
       .fill();
    if (priority) {
      doc.rect(50, y, 3, rowH).fillColor(getPriorityColor(priority)).fill();
    }
    doc.fillColor(colors.foreground).fontSize(9).font('Body')
       .text(`${i + 1}. ${cleanText}`, 58, y + 5, { width: doc.page.width - 150, height: rowH - 6 });
    if (priority) {
      createBadge(doc, doc.page.width - 120, y + 5, priority, getPriorityColor(priority), getPriorityBgColor(priority));
    }
    doc.y = y + rowH + 2;
  });
  doc.moveDown(0.5);
}

// ─────────────────────────────────────────────────────────────────────
// Bilingual labels for the master PDF (en + hr — keep both in sync!)
// ─────────────────────────────────────────────────────────────────────
type Lang = 'en' | 'hr';
type PdfLabels = {
  freeReport: string; basicReport: string; proReport: string;
  masterReport: string; generated: string; overall: string; overallDashboard: string;
  snapshot: string; fullDataIncluded: string; fullDataPlusFixes: string;
  keyFindings: string;
  issuesFound: (n: number) => string;
  moreHidden: (n: number) => string;
  noIssues: string; detailedBreakdown: string; lockedInFree: string; fullDetailsLocked: string;
  sectionScore: (n: number) => string;
  summary: (p: number, w: number, f: number) => string;
  unlockFullReport: string; upgradePitch: string;
  tierBasicLabel: string; tierProLabel: string;
  basicDesc: string; proDesc: string;
  upgradeNow: string; wantFixes: string; upsellPro: string; fixLabel: string;
  pageLabel: (n: number, t: number) => string;
  toolNames: { seo: string; ads: string; aeo: string; geo: string; links: string; images: string; internal: string; sitemap: string };
  pillCritical: string; pillWarning: string; lockedTag: string;
  totalLabel: string; passLabel: string; warningLabel: string; failLabel: string;
  scoreLabel: string; ratingLabel: string; yes: string; no: string;
  seoSubScores: { technical: string; performance: string; accessibility: string; keywords: string; content: string };
  aeoSubScores: { structuredData: string; contentFormat: string; authority: string; semantic: string; aiAccess: string; citationLikelihood: string };
  geoSubScores: { sourceAuth: string; fluency: string; uniqueValue: string; entityOpt: string; multiFormat: string; generativeReadiness: string };
  linkStats: { total: string; working: string; broken: string; redirects: string; score: string };
  imgStats: { score: string; totalImages: string; withAlt: string; withoutAlt: string; modernFormat: string };
  ilStats: { score: string; totalLinks: string; uniqueLinks: string; descriptive: string; generic: string };
  sitemapLabels: { robotsTxt: string; sitemap: string; found: string; notFound: string; urlsInSitemap: string; score: string; issues: string };
  sectionTitles: { technicalChecks: string; adsChecks: string; aeoChecks: string; geoChecks: string; brokenLinksFound: string; issues: string };
  metaSubject: string;
  issueDetected: string;
  dateLocale: string;
  redirectsLabel: string;
};
const PDF_LABELS: Record<Lang, PdfLabels> = {
  en: {
    freeReport: 'Free Report',
    basicReport: 'Basic Report — €19',
    proReport: 'Pro Report — €29',
    masterReport: 'Master Analysis Report',
    generated: 'Generated',
    overall: 'Overall',
    overallDashboard: 'Overall Score Dashboard',
    snapshot: '8 tools · Snapshot',
    fullDataIncluded: '8 tools · All data included',
    fullDataPlusFixes: '8 tools · Full data + fixes',
    keyFindings: 'Key Findings',
    issuesFound: (n: number) => `${n} issues found`,
    moreHidden: (n: number) => `+ ${n} more issues hidden — unlock to see all`,
    noIssues: "Looking good! No critical issues detected.",
    detailedBreakdown: 'Detailed Section Breakdown',
    lockedInFree: 'Locked in Free',
    fullDetailsLocked: 'Full check details locked — upgrade to view',
    sectionScore: (n: number) => `Score ${n}`,
    summary: (p: number, w: number, f: number) => `${p} pass · ${w} warn · ${f} fail`,
    unlockFullReport: 'Unlock the full report',
    upgradePitch: "See every check, data point and exact instructions to fix what's holding your site back.",
    tierBasicLabel: 'Basic',
    tierProLabel: 'Pro · Recommended',
    basicDesc: 'All sections, all data',
    proDesc: 'Everything in Basic + step-by-step fixes',
    upgradeNow: 'Upgrade now →',
    wantFixes: 'Want the exact fix instructions?',
    upsellPro: 'Pro (€29) adds prioritized recommendations and step-by-step instructions for every issue above. Existing scan credits can be upgraded.',
    fixLabel: 'Fix:',
    pageLabel: (n: number, t: number) => `Page ${n} of ${t}`,
    toolNames: {
      seo: 'SEO Audit',
      ads: 'Google Ads Landing Page',
      aeo: 'AEO / AI SEO Readiness',
      geo: 'GEO / Generative Engine',
      links: 'Broken Link Check',
      images: 'Image Optimization',
      internal: 'Internal Linking',
      sitemap: 'Sitemap & Robots.txt',
    },
    pillCritical: 'CRITICAL', pillWarning: 'WARNING', lockedTag: '[ LOCKED ]',
    totalLabel: 'Total', passLabel: 'Pass', warningLabel: 'Warning', failLabel: 'Fail',
    scoreLabel: 'Score', ratingLabel: 'Rating', yes: 'Yes', no: 'No',
    seoSubScores: { technical: 'Technical', performance: 'Performance', accessibility: 'Accessibility', keywords: 'Keywords', content: 'Content' },
    aeoSubScores: { structuredData: 'Structured Data', contentFormat: 'Content Format', authority: 'Authority', semantic: 'Semantic', aiAccess: 'AI Access', citationLikelihood: 'Citation Likelihood' },
    geoSubScores: { sourceAuth: 'Source Auth.', fluency: 'Fluency', uniqueValue: 'Unique Value', entityOpt: 'Entity Opt.', multiFormat: 'Multi-Format', generativeReadiness: 'Generative Readiness' },
    linkStats: { total: 'Total', working: 'Working', broken: 'Broken', redirects: 'Redirects', score: 'Score' },
    imgStats: { score: 'Score', totalImages: 'Total Images', withAlt: 'With Alt Text', withoutAlt: 'Without Alt', modernFormat: 'Modern Format' },
    ilStats: { score: 'Score', totalLinks: 'Total Links', uniqueLinks: 'Unique Links', descriptive: 'Descriptive', generic: 'Generic' },
    sitemapLabels: { robotsTxt: 'Robots.txt', sitemap: 'Sitemap', found: 'Found', notFound: 'Not Found', urlsInSitemap: 'URLs in Sitemap', score: 'Score', issues: 'Issues' },
    sectionTitles: { technicalChecks: 'Technical Checks', adsChecks: 'Ads Checks', aeoChecks: 'AEO Checks', geoChecks: 'GEO Checks', brokenLinksFound: 'Broken Links Found:', issues: 'Issues:' },
    metaSubject: 'Comprehensive Website Analysis',
    issueDetected: 'Issue detected',
    dateLocale: 'en-US',
    redirectsLabel: 'Redirects',
  },
  hr: {
    freeReport: 'Besplatno izvješće',
    basicReport: 'Osnovno izvješće — €19',
    proReport: 'Pro izvješće — €29',
    masterReport: 'Glavno analitičko izvješće',
    generated: 'Generirano',
    overall: 'Ukupno',
    overallDashboard: 'Pregled ukupnih ocjena',
    snapshot: '8 alata · Pregled',
    fullDataIncluded: '8 alata · Svi podaci uključeni',
    fullDataPlusFixes: '8 alata · Svi podaci + popravci',
    keyFindings: 'Ključni nalazi',
    issuesFound: (n: number) => `Pronađeno ${n} problema`,
    moreHidden: (n: number) => `+ ${n} dodatnih problema skriveno — otključajte za sve`,
    noIssues: 'Sve izgleda dobro! Nema kritičnih problema.',
    detailedBreakdown: 'Detaljna analiza po sekcijama',
    lockedInFree: 'Zaključano (Besplatno)',
    fullDetailsLocked: 'Detalji provjera zaključani — nadogradite za pregled',
    sectionScore: (n: number) => `Ocjena ${n}`,
    summary: (p: number, w: number, f: number) => `${p} prolazi · ${w} upoz · ${f} grešaka`,
    unlockFullReport: 'Otključajte cijelo izvješće',
    upgradePitch: 'Pogledajte svaku provjeru, podatak i točne upute kako popraviti što vas usporava.',
    tierBasicLabel: 'Osnovno',
    tierProLabel: 'Pro · Preporučeno',
    basicDesc: 'Sve sekcije, svi podaci',
    proDesc: 'Sve iz Osnovnog + upute korak-po-korak',
    upgradeNow: 'Nadogradite sada →',
    wantFixes: 'Želite točne upute za popravak?',
    upsellPro: 'Pro (€29) dodaje prioritetne preporuke i upute korak-po-korak za svaki problem iznad. Postojeći krediti mogu se nadograditi.',
    fixLabel: 'Popravak:',
    pageLabel: (n: number, t: number) => `Stranica ${n} od ${t}`,
    toolNames: {
      seo: 'SEO analiza',
      ads: 'Odredišna stranica za Google Ads',
      aeo: 'AEO / AI SEO spremnost',
      geo: 'GEO / Generativni pretraživači',
      links: 'Provjera neispravnih veza',
      images: 'Optimizacija slika',
      internal: 'Interno povezivanje',
      sitemap: 'Sitemap i Robots.txt',
    },
    pillCritical: 'KRITIČNO', pillWarning: 'UPOZORENJE', lockedTag: '[ ZAKLJUČANO ]',
    totalLabel: 'Ukupno', passLabel: 'Prolazi', warningLabel: 'Upozorenje', failLabel: 'Greška',
    scoreLabel: 'Ocjena', ratingLabel: 'Ocjena', yes: 'Da', no: 'Ne',
    seoSubScores: { technical: 'Tehnički', performance: 'Performanse', accessibility: 'Pristupačnost', keywords: 'Ključne riječi', content: 'Sadržaj' },
    aeoSubScores: { structuredData: 'Strukturirani podaci', contentFormat: 'Format sadržaja', authority: 'Autoritet', semantic: 'Semantika', aiAccess: 'AI pristup', citationLikelihood: 'Vjerojatnost citiranja' },
    geoSubScores: { sourceAuth: 'Autoritet izvora', fluency: 'Tečnost', uniqueValue: 'Jedinstvena vrijednost', entityOpt: 'Optim. entiteta', multiFormat: 'Više formata', generativeReadiness: 'Generativna spremnost' },
    linkStats: { total: 'Ukupno', working: 'Radi', broken: 'Pokvareno', redirects: 'Preusmj.', score: 'Ocjena' },
    imgStats: { score: 'Ocjena', totalImages: 'Ukupno slika', withAlt: 'S alt tekstom', withoutAlt: 'Bez alt teksta', modernFormat: 'Moderni format' },
    ilStats: { score: 'Ocjena', totalLinks: 'Ukupno veza', uniqueLinks: 'Jedinstvene veze', descriptive: 'Opisne', generic: 'Generičke' },
    sitemapLabels: { robotsTxt: 'Robots.txt', sitemap: 'Sitemap', found: 'Pronađen', notFound: 'Nije pronađen', urlsInSitemap: 'URL-ovi u sitemapu', score: 'Ocjena', issues: 'Problemi' },
    sectionTitles: { technicalChecks: 'Tehničke provjere', adsChecks: 'Provjere oglasa', aeoChecks: 'AEO provjere', geoChecks: 'GEO provjere', brokenLinksFound: 'Pronađene neispravne veze:', issues: 'Problemi:' },
    metaSubject: 'Sveobuhvatna analiza web-stranice',
    issueDetected: 'Otkriven problem',
    dateLocale: 'hr-HR',
    redirectsLabel: 'Preusmjeravanja',
  },
};

const TIER_THEME = {
  free:  { from: '#16a34a', to: '#0ea5e9', accent: '#16a34a' },
  basic: { from: '#1e40af', to: '#0ea5e9', accent: '#1e40af' },
  pro:   { from: '#7c3aed', to: '#db2777', accent: '#7c3aed' },
} as const;

const TOOL_COLORS: Record<string, string> = {
  seo: '#3b82f6', ads: '#f59e0b', aeo: '#8b5cf6', geo: '#14b8a6',
  links: '#ef4444', images: '#10b981', internal: '#06b6d4', sitemap: '#ec4899',
};

// ──────────────────────────────────────────────────────────────────
// Mockup-style helpers — rounded cards, severity pills, tool head bar
// ──────────────────────────────────────────────────────────────────

function drawSeverityPill(
  doc: InstanceType<typeof PDFDocument>,
  x: number, y: number, status: string, L: PdfLabels,
): number {
  const s = String(status || '').toUpperCase();
  let label: string, color: string, bg: string;
  if (s === 'PASS') { label = L.passLabel.toUpperCase(); color = '#15803d'; bg = '#dcfce7'; }
  else if (s === 'WARNING' || s === 'WARN') { label = L.pillWarning.toUpperCase(); color = '#b45309'; bg = '#fef3c7'; }
  else { label = L.pillCritical.toUpperCase(); color = '#b91c1c'; bg = '#fee2e2'; }
  doc.fontSize(7).font('BodyBold');
  const tw = doc.widthOfString(label);
  const pw = tw + 12;
  doc.roundedRect(x, y, pw, 12, 6).fillColor(bg).fill();
  doc.fillColor(color).fontSize(7).font('BodyBold')
     .text(label, x + 6, y + 2.5, { width: tw + 1, lineBreak: false });
  return pw;
}

function drawIconChip(
  doc: InstanceType<typeof PDFDocument>,
  x: number, y: number, color: string, size: number = 14,
) {
  doc.roundedRect(x, y, size, size, 3).fillColor(color).fillOpacity(0.18).fill();
  doc.fillOpacity(1);
  const inner = Math.max(4, size - 8);
  const ix = x + (size - inner) / 2;
  const iy = y + (size - inner) / 2;
  doc.roundedRect(ix, iy, inner, inner, 1.5).fillColor(color).fill();
}

function drawScorePill(
  doc: InstanceType<typeof PDFDocument>,
  x: number, y: number, score: number, color: string, L: PdfLabels,
): number {
  const text = L.sectionScore(score);
  doc.fontSize(8).font('BodyBold');
  const tw = doc.widthOfString(text);
  const pw = tw + 14;
  doc.roundedRect(x, y, pw, 14, 7).fillColor(color).fillOpacity(0.16).fill();
  doc.fillOpacity(1);
  doc.fillColor(color).fontSize(8).font('BodyBold')
     .text(text, x + 7, y + 3, { width: tw + 1, lineBreak: false });
  return pw;
}

function getToolChecks(
  toolKey: string,
  data: any,
  L: PdfLabels,
): { name: string; status: string; details: string; recommendation?: string }[] {
  if (!data) return [];
  const norm = (s: string) => {
    const u = String(s || '').toUpperCase();
    if (u === 'ERROR' || u === 'CRITICAL') return 'FAIL';
    if (u === 'WARN') return 'WARNING';
    if (u === 'PASS' || u === 'OK' || u === 'SUCCESS') return 'PASS';
    if (u === 'FAIL' || u === 'WARNING') return u;
    return 'WARNING';
  };
  const recOf = (c: any): string => {
    // Prefer the rich, multi-step technicalFix when present (Pro tier deep-dive),
    // and fall back to the short recommendation/fix/action/howToFix string.
    const r = c?.technicalFix || c?.recommendation || c?.fix || c?.action || c?.howToFix || '';
    return typeof r === 'string' ? r : '';
  };
  const out: { name: string; status: string; details: string; recommendation?: string }[] = [];
  switch (toolKey) {
    case 'seo': {
      // Schema: AnalysisResults exposes `technical: TechnicalSeoCheck[]` and
      // `accessibility: AccessibilityCheck[]` as the only check arrays.
      // `performance`, `keyword` (singular), and `content` are metric objects,
      // not check rows, so iterating them is a no-op.
      const r = data.results || {};
      (['technical', 'accessibility'] as const).forEach(k => {
        const arr = r[k];
        if (Array.isArray(arr)) arr.forEach((c: any) => out.push({
          name: c.name || L.issueDetected,
          status: norm(c.status),
          details: c.details || c.message || '',
          recommendation: recOf(c),
        }));
      });
      break;
    }
    case 'ads':
    case 'aeo':
    case 'geo': {
      const arr = data.results?.checks;
      if (Array.isArray(arr)) arr.forEach((c: any) => out.push({
        name: c.name || L.issueDetected,
        status: norm(c.status),
        details: c.details || c.message || '',
        recommendation: recOf(c),
      }));
      break;
    }
    case 'links': {
      // Schema: BrokenLinksResult has `brokenLinks: BrokenLink[]` directly —
      // each item exposes `url`, `statusCode`, `statusText` (no `status` field).
      // Old code looked under `data.links?.filter(l => l.status === 'broken')`
      // which never resolved against real analyzer output.
      const broken: any[] = Array.isArray(data.brokenLinks)
        ? data.brokenLinks
        : (Array.isArray(data.brokenLinksList) ? data.brokenLinksList : []);
      broken.slice(0, 30).forEach((link: any) => {
        const url = typeof link === 'string' ? link : (link.url || link.href || '');
        const code = link?.statusCode ?? link?.code ?? '';
        const text = link?.statusText || '';
        const detail = code ? `HTTP ${code}${text ? ' ' + text : ''}` : (text || '');
        out.push({
          name: String(url),
          status: 'FAIL',
          details: detail,
        });
      });
      const working = data.workingLinks ?? 0;
      const total = data.totalLinks ?? 0;
      if (working > 0) {
        out.push({
          name: `${working} ${L.linkStats.working}`,
          status: 'PASS',
          details: `${total} ${L.linkStats.total}`,
        });
      }
      break;
    }
    case 'images': {
      // Schema: ImageOptimizationResult exposes `imagesWithAlt` (NOT
      // `withAltText`) and has no `withoutAltText` field — derive it from
      // `totalImages - imagesWithAlt`. Old code read non-existent fields and
      // rendered "0 / N" rows for every site.
      const total = data.totalImages ?? 0;
      const withAlt = data.imagesWithAlt ?? 0;
      const without = Math.max(0, total - withAlt);
      const modern = data.modernFormatCount ?? 0;
      out.push({
        name: L.imgStats.withoutAlt,
        status: without > 0 ? 'FAIL' : 'PASS',
        details: `${without} / ${total}`,
      });
      out.push({
        name: L.imgStats.modernFormat,
        status: modern >= total / 2 ? 'PASS' : 'WARNING',
        details: `${modern} / ${total}`,
      });
      out.push({
        name: L.imgStats.withAlt,
        status: withAlt >= total / 2 ? 'PASS' : 'WARNING',
        details: `${withAlt} / ${total}`,
      });
      break;
    }
    case 'internal': {
      // Schema: InternalLinkingResult uses `totalInternalLinks` /
      // `uniqueInternalLinks` (NOT `totalLinks` / `uniqueLinks`). Fall back to
      // the short names for forward-compat with any older fixtures.
      const total = data.totalInternalLinks ?? data.totalLinks ?? 0;
      const generic = data.genericAnchors ?? 0;
      const descriptive = data.descriptiveAnchors ?? 0;
      const unique = data.uniqueInternalLinks ?? data.uniqueLinks ?? 0;
      out.push({
        name: L.ilStats.descriptive,
        status: descriptive >= generic ? 'PASS' : 'WARNING',
        details: `${descriptive} / ${total}`,
      });
      out.push({
        name: L.ilStats.generic,
        status: generic === 0 ? 'PASS' : 'WARNING',
        details: `${generic} / ${total}`,
      });
      out.push({
        name: L.ilStats.uniqueLinks,
        status: unique > 0 ? 'PASS' : 'WARNING',
        details: `${unique} / ${total}`,
      });
      break;
    }
    case 'sitemap': {
      const robotsExists = data.robotsTxt?.exists ?? data.hasRobotsTxt;
      const smExists = data.sitemap?.exists ?? data.hasSitemap;
      out.push({
        name: L.sitemapLabels.robotsTxt,
        status: robotsExists ? 'PASS' : 'FAIL',
        details: robotsExists ? L.sitemapLabels.found : L.sitemapLabels.notFound,
      });
      out.push({
        name: L.sitemapLabels.sitemap,
        status: smExists ? 'PASS' : 'FAIL',
        details: smExists ? L.sitemapLabels.found : L.sitemapLabels.notFound,
      });
      // Schema: SitemapValidatorResult has no top-level `issues`. Real
      // issues live nested under robotsTxt.issues + sitemap.issues. Merge,
      // dedupe, and cap at 5 so the section card doesn't sprawl.
      // Suppress nested issues when their parent's existence already failed —
      // the existence FAIL row above already represents that defect, so
      // emitting "robots.txt not found" again would double-count.
      const robotsIssues: any[] = robotsExists && Array.isArray(data.robotsTxt?.issues) ? data.robotsTxt.issues : [];
      const sitemapIssues: any[] = smExists && Array.isArray(data.sitemap?.issues) ? data.sitemap.issues : [];
      const legacyIssues: any[] = Array.isArray(data.issues) ? data.issues : [];
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const seen = new Set<string>();
      const allIssues = [...robotsIssues, ...sitemapIssues, ...legacyIssues].filter(iss => {
        const raw = typeof iss === 'string' ? iss : (iss?.message || iss?.description || JSON.stringify(iss));
        const key = norm(String(raw));
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      allIssues.slice(0, 5).forEach((iss: any) => {
        const text = typeof iss === 'string' ? iss : (iss.message || iss.description || L.issueDetected);
        out.push({
          name: String(text),
          status: 'WARNING',
          details: '',
        });
      });
      break;
    }
  }
  return out;
}

// Word-break safe text: split very long unbroken tokens (URLs, paths) by
// inserting a zero-width space (U+200B) after URL-friendly punctuation so
// PDFKit's line wrapper can break long URLs/code without rendering visible
// whitespace. Inter ships full Latin coverage including U+200B so the glyph
// layout never crashes.
function wrapLongTokens(text: string, maxTokenLen = 40): string {
  if (!text) return '';
  // Use zero-width space (\u200B) so PDFKit can break long URLs/code at the
  // boundary WITHOUT rendering visible whitespace. Visible spaces in URLs
  // (e.g. "https:/ / example.com/ path/") look broken; ZWSP keeps them clean
  // while still allowing line wrap.
  const ZWSP = '\u200B';
  return String(text).split(/(\s+)/).map(tok => {
    if (/\s/.test(tok)) return tok;
    if (tok.length <= maxTokenLen) return tok;
    // Insert a soft break after URL-friendly punctuation
    let broken = tok.replace(/([\/?&=])/g, '$1' + ZWSP);
    // If still has runs longer than maxTokenLen, force-insert a soft break
    broken = broken.replace(new RegExp(`(\\S{${maxTokenLen}})`, 'g'), '$1' + ZWSP);
    return broken;
  }).join('');
}

// Register Inter as Body / BodyBold / BodyItalic. Inter supports the full
// Latin Extended range needed for Croatian diacritics (č, ć, š, ž, đ).
// Falls back to DejaVu Sans (system) and finally PDFKit's built-in Helvetica
// when font files are missing, so PDF generation never crashes on a stripped
// environment. Project-bundled TTFs live under server/assets/fonts/.
function registerInterFonts(doc: InstanceType<typeof PDFDocument>): void {
  // CRITICAL: NEVER register Body/BodyBold/BodyItalic more than once per
  // document. PDFKit subsets each registered font name into the PDF's
  // internal font dictionary and builds a glyph-index map keyed on the name.
  // Re-registering the same name to a different font (even Helvetica → TTF)
  // corrupts that map mid-document, producing garbled glyphs in some places
  // and correct glyphs in others — exactly the broken-Croatian symptom we
  // observed in the live site PDF (header IZVJEŠĆE → "IZVJEŠdRr#•" while
  // body text "Odredišna", "Provjera" rendered fine).
  //
  // So: probe TTFs FIRST under throwaway alias names, and ONLY register the
  // canonical Body/BodyBold/BodyItalic names ONCE — to whichever font we
  // proved loadable. Helvetica is the absolute last-resort fallback (it can
  // render Latin-1 only — diacritics will appear as boxes — but it guarantees
  // PDFKit doesn't crash).

  const candidates = [
    {
      label: 'Inter (bundled)',
      regular: path.join(FONT_DIR, 'Inter-Regular.ttf'),
      bold: path.join(FONT_DIR, 'Inter-Bold.ttf'),
      italic: path.join(FONT_DIR, 'Inter-Italic.ttf'),
    },
    {
      label: 'DejaVu Sans (system)',
      regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
      italic: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf',
    },
  ];

  // Try each candidate under throwaway probe names. registerFont() does NOT
  // throw on corrupt TTFs — the parse happens on first .font() call — so we
  // force a parse by calling .font(probeAlias) inside try/catch.
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const reg = `__probe_reg_${i}`;
    const bold = `__probe_bold_${i}`;
    const ital = `__probe_ital_${i}`;
    try {
      if (!fs.existsSync(c.regular) || !fs.existsSync(c.bold)) continue;
      const italPath = fs.existsSync(c.italic) ? c.italic : c.regular;
      doc.registerFont(reg, c.regular);
      doc.registerFont(bold, c.bold);
      doc.registerFont(ital, italPath);
      // Force lazy-parse of all three. Throws on bad TTFs.
      doc.font(reg); doc.font(bold); doc.font(ital);
      // All three parsed cleanly — register the CANONICAL aliases ONCE.
      doc.registerFont('Body', c.regular);
      doc.registerFont('BodyBold', c.bold);
      doc.registerFont('BodyItalic', italPath);
      return;
    } catch {
      continue;
    }
  }

  // All TTF candidates failed — last-resort Helvetica fallback. Helvetica is
  // Latin-1/WinAnsi only: it CAN render š/ž/Š/Ž but CANNOT render č/ć/Č/Ć/đ/Đ
  // (those silently degrade to wrong glyphs in the output). We log a loud
  // warning so this state is observable in production logs.
  // eslint-disable-next-line no-console
  console.warn('[pdfGenerator] All TTF candidates failed — falling back to Helvetica. Croatian diacritics č/ć/đ will render incorrectly. Checked paths:', candidates.map(c => c.regular));
  try {
    doc.registerFont('Body', 'Helvetica');
    doc.registerFont('BodyBold', 'Helvetica-Bold');
    doc.registerFont('BodyItalic', 'Helvetica-Oblique');
  } catch { /* base14 always present */ }
}

// Hard-truncate text to fit `maxWidth` at the doc's CURRENT font + size.
// Returns the original string if it already fits, else trims and appends an
// ellipsis. Use this when PDFKit's built-in `ellipsis: true` is unreliable
// (e.g. URLs with natural break points like '/') and the text MUST stay on
// a single line and not bleed into adjacent regions.
function ellipsizeToWidth(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  maxWidth: number,
): string {
  if (!text) return '';
  if (doc.widthOfString(text) <= maxWidth) return text;
  const ell = '…';
  if (doc.widthOfString(ell) > maxWidth) return '';
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.widthOfString(text.substring(0, mid) + ell) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.substring(0, lo) + ell;
}

// Mockup-style check row used in Basic/Pro per-tool sections.
// Fixed columns: [sev pill | name (single-line ellipsis) above detail (wraps) ].
// Returns the height consumed.
// Pre-compute the height a check row will consume. Mirrors drawCheckRow's
// internal measurements so the caller can lay out a section card.
function measureCheckRowH(
  doc: InstanceType<typeof PDFDocument>,
  check: { name: string; status: string; details: string },
  width: number,
  L: PdfLabels,
): number {
  const padX = 12, padY = 7;
  const pillLabel = (() => {
    const u = String(check.status).toUpperCase();
    if (u === 'PASS') return L.passLabel.toUpperCase();
    if (u === 'WARNING' || u === 'WARN') return L.pillWarning.toUpperCase();
    return L.pillCritical.toUpperCase();
  })();
  doc.fontSize(7).font('BodyBold');
  const pillW = doc.widthOfString(pillLabel) + 12;
  const contentW = width - padX - pillW - 8 - padX;
  const detailText = wrapLongTokens(String(check.details || ''));
  doc.fontSize(8).font('Body');
  let detailH = 0;
  if (detailText) detailH = Math.min(doc.heightOfString(detailText, { width: contentW }), 22);
  const nameH = 11;
  return padY + nameH + (detailH ? 2 + detailH : 0) + padY;
}

// Flat check row used inside a section card. NO background; relies on the
// outer card outline + dashed dividers between rows. Caller is responsible
// for ensureSpace and y placement.
function drawCheckRow(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  width: number,
  check: { name: string; status: string; details: string },
  L: PdfLabels,
): number {
  const padX = 12, padY = 7;
  const pillLabel = (() => {
    const u = String(check.status).toUpperCase();
    if (u === 'PASS') return L.passLabel.toUpperCase();
    if (u === 'WARNING' || u === 'WARN') return L.pillWarning.toUpperCase();
    return L.pillCritical.toUpperCase();
  })();
  doc.fontSize(7).font('BodyBold');
  const pillW = doc.widthOfString(pillLabel) + 12;
  const contentX = x + padX + pillW + 8;
  const contentW = width - padX - pillW - 8 - padX;

  const detailText = wrapLongTokens(String(check.details || ''));
  doc.fontSize(8).font('Body');
  const maxDetailH = 22;
  let detailH = 0;
  if (detailText) detailH = Math.min(doc.heightOfString(detailText, { width: contentW }), maxDetailH);
  const nameH = 11;
  const totalH = padY + nameH + (detailH ? 2 + detailH : 0) + padY;

  // Sev pill on the left, vertically aligned with the name baseline
  drawSeverityPill(doc, x + padX, y + padY - 1, check.status, L);

  // Name — single-line, hard-truncated with ellipsis to never bleed
  doc.fontSize(9).font('BodyBold');
  const nameText = ellipsizeToWidth(doc, check.name || '', contentW);
  doc.fillColor(colors.foreground)
     .text(nameText, contentX, y + padY, { width: contentW, lineBreak: false });

  // Detail — wrapped, clipped to max 2 lines
  if (detailText) {
    doc.fillColor(colors.mutedForeground).fontSize(8).font('Body')
       .text(detailText, contentX, y + padY + nameH + 2, { width: contentW, height: maxDetailH, ellipsis: true });
  }

  return totalH;
}

// Pre-compute height of an inline Pro fix panel for a given content width.
function measureProInlineFixH(
  doc: InstanceType<typeof PDFDocument>,
  recommendation: string,
  width: number,
): number {
  const padX = 12, padY = 7;
  const text = wrapLongTokens(recommendation);
  doc.fontSize(8).font('Body');
  const textH = doc.heightOfString(text, { width: width - padX * 2 - 4 });
  return padY + 11 + 2 + textH + padY - 2;
}

// Inline Pro fix panel rendered FLAT inside a section card under a check
// row that has a per-check recommendation. Lavender background fills the
// card width with a left purple accent stripe — no own outline (the section
// card outline wraps it). Caller handles ensureSpace + y placement.
function drawProInlineFix(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  width: number,
  recommendation: string,
  L: PdfLabels,
): number {
  const padX = 12, padY = 7;
  const text = wrapLongTokens(recommendation);
  doc.fontSize(8).font('Body');
  const textH = doc.heightOfString(text, { width: width - padX * 2 - 4 });
  const totalH = padY + 11 + 2 + textH + padY - 2;

  // Flat lavender fill inside the section card
  doc.rect(x, y, width, totalH).fillColor('#faf5ff').fill();
  // Left purple accent stripe
  doc.rect(x, y, 3, totalH).fillColor('#a855f7').fill();

  doc.fillColor('#6b21a8').fontSize(9).font('BodyBold')
     .text(L.fixLabel, x + padX, y + padY, { lineBreak: false });
  doc.fillColor('#581c87').fontSize(8).font('Body')
     .text(text, x + padX, y + padY + 11, { width: width - padX * 2 - 4 });

  return totalH;
}

// Draws the gray "section head" strip INSIDE an already-drawn rounded card
// — the visual analog of `.section-head` in the canvas mockup. Renders the
// icon chip, tool name (single-line ellipsis), pass/warn/fail summary and
// the colored score pill. No outline; expected to live above check rows.
function drawSectionHeadStrip(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  width: number,
  height: number,
  toolKey: string,
  toolName: string,
  score: number,
  counts: { pass: number; warn: number; fail: number } | null,
  L: PdfLabels,
) {
  const color = TOOL_COLORS[toolKey] || colors.primary;

  // Gray fill (rounded only on top — caller has already drawn the card
  // outline, so we just paint a flat strip and rely on the card outline).
  doc.rect(x, y, width, height).fillColor('#f8fafc').fill();
  // Bottom divider
  doc.moveTo(x, y + height).lineTo(x + width, y + height)
     .strokeColor('#e2e8f0').lineWidth(0.5).stroke();

  drawIconChip(doc, x + 12, y + (height - 14) / 2, color, 14);

  // Right side: score pill + (optional) summary text
  doc.fontSize(8).font('BodyBold');
  const scorePillW = doc.widthOfString(L.sectionScore(score)) + 14;
  let summary = '';
  let summaryW = 0;
  if (counts) {
    summary = L.summary(counts.pass, counts.warn, counts.fail);
    doc.fontSize(8).font('Body');
    summaryW = doc.widthOfString(summary) + 12;
  }
  const rightReserved = scorePillW + summaryW + 24;
  const titleX = x + 34;
  const titleW = Math.max(60, width - 36 - rightReserved);

  // Tool title
  doc.fontSize(10).font('BodyBold');
  const titleText = ellipsizeToWidth(doc, toolName, titleW);
  doc.fillColor(colors.foreground)
     .text(titleText, titleX, y + (height - 10) / 2 + 0.5, { width: titleW, lineBreak: false });

  // Score pill on the far right
  drawScorePill(doc, x + width - scorePillW - 12, y + (height - 14) / 2, score, color, L);

  // Summary text immediately to the left of the score pill
  if (counts) {
    doc.fillColor(colors.mutedForeground).fontSize(8).font('Body')
       .text(summary, x + width - scorePillW - 12 - summaryW, y + (height - 8) / 2 + 0.5,
             { width: summaryW, lineBreak: false });
  }
}

function countChecks(checks: { status: string }[]): { pass: number; warn: number; fail: number } {
  let p = 0, w = 0, f = 0;
  for (const c of checks) {
    const s = String(c.status).toUpperCase();
    if (s === 'PASS') p++;
    else if (s === 'WARNING' || s === 'WARN') w++;
    else f++;
  }
  return { pass: p, warn: w, fail: f };
}

function drawFreeFindingsCard(
  doc: InstanceType<typeof PDFDocument>,
  pageWidth: number,
  toolKey: string,
  toolName: string,
  score: number,
  allChecks: { name: string; status: string; details: string }[],
  L: PdfLabels,
) {
  const cardX = 40, cardW = pageWidth - 80;
  const headH = 28;

  const sorted = [...allChecks].sort((a, b) => {
    const rank = (s: string) => {
      const u = String(s).toUpperCase();
      if (u === 'FAIL') return 0;
      if (u === 'WARNING' || u === 'WARN') return 1;
      return 2;
    };
    return rank(a.status) - rank(b.status);
  });
  const visible = sorted.slice(0, 3);
  const hidden = Math.max(0, sorted.length - visible.length);
  const counts = countChecks(allChecks);

  // Stacked rows: name on top (1 line, ellipsised) + detail below (1 line, ellipsised).
  // Matches the canvas mockup — no more side-by-side bleed.
  const stackedRowH = 26;
  const bodyH = visible.length === 0
    ? 28
    : visible.length * stackedRowH + (hidden > 0 ? 18 : 8);
  const totalH = headH + bodyH;

  ensureSpace(doc, totalH + 10);
  const y = doc.y;
  const color = TOOL_COLORS[toolKey] || colors.primary;

  // Outer rounded card (white body)
  doc.roundedRect(cardX, y, cardW, totalH, 14).fillColor('#ffffff').fill();
  // Gray header strip (flat — outline overlay clips the corners)
  doc.rect(cardX, y, cardW, headH).fillColor('#f8fafc').fill();
  // Divider under head
  doc.moveTo(cardX, y + headH).lineTo(cardX + cardW, y + headH)
     .strokeColor('#e2e8f0').lineWidth(0.5).stroke();
  // Outer outline ON TOP so it visually clips the gray strip's flat corners
  doc.roundedRect(cardX, y, cardW, totalH, 14).strokeColor('#e2e8f0').lineWidth(0.75).stroke();

  // Icon chip
  drawIconChip(doc, cardX + 12, y + (headH - 14) / 2, color, 14);

  // Right side: score pill + summary text — compute widths first
  doc.fontSize(8).font('BodyBold');
  const scorePillW = doc.widthOfString(L.sectionScore(score)) + 14;
  const summary = L.summary(counts.pass, counts.warn, counts.fail);
  doc.fontSize(8).font('Body');
  const summaryW = doc.widthOfString(summary) + 12;
  const headRightReserved = scorePillW + summaryW + 24;
  const headTitleW = Math.max(60, cardW - 36 - headRightReserved);

  doc.fontSize(10).font('BodyBold');
  const titleText = ellipsizeToWidth(doc, toolName, headTitleW);
  doc.fillColor(colors.foreground)
     .text(titleText, cardX + 34, y + (headH - 10) / 2 + 0.5, { width: headTitleW, lineBreak: false });

  drawScorePill(doc, cardX + cardW - scorePillW - 12, y + (headH - 14) / 2, score, color, L);

  doc.fillColor(colors.mutedForeground).fontSize(8).font('Body')
     .text(summary, cardX + cardW - scorePillW - 12 - summaryW, y + (headH - 8) / 2 + 0.5,
           { width: summaryW, lineBreak: false });

  // Body rows
  if (visible.length === 0) {
    doc.fillColor('#16a34a').fontSize(8).font('Body')
       .text(L.noIssues, cardX + 14, y + headH + 7, { width: cardW - 28, lineBreak: false });
  } else {
    visible.forEach((c, i) => {
      const ry = y + headH + 5 + i * stackedRowH;
      const pw = drawSeverityPill(doc, cardX + 14, ry + 1, c.status, L);

      // Stacked layout: pill on the left, then [name on top, detail below].
      const textX = cardX + 14 + pw + 8;
      const textW = cardX + cardW - 14 - textX;

      doc.fontSize(8).font('BodyBold');
      const nameText = ellipsizeToWidth(doc, c.name || '', textW);
      doc.fillColor(colors.foreground)
         .text(nameText, textX, ry, { width: textW, lineBreak: false });

      if (c.details) {
        doc.fontSize(8).font('Body');
        const detailText = ellipsizeToWidth(doc, c.details, textW);
        doc.fillColor(colors.mutedForeground)
           .text(detailText, textX, ry + 11, { width: textW, lineBreak: false });
      }

      if (i < visible.length - 1) {
        doc.save();
        doc.dash(2, { space: 2 })
           .moveTo(cardX + 14, ry + stackedRowH - 3).lineTo(cardX + cardW - 14, ry + stackedRowH - 3)
           .strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        doc.undash();
        doc.restore();
      }
    });
    if (hidden > 0) {
      const fy = y + headH + 5 + visible.length * stackedRowH;
      doc.fillColor(colors.mutedForeground).fontSize(7).font('BodyItalic')
         .text(L.moreHidden(hidden), cardX, fy, { width: cardW, align: 'center', lineBreak: false });
    }
  }

  doc.y = y + totalH + 8;
}

function drawTierHeader(
  doc: InstanceType<typeof PDFDocument>,
  pageWidth: number,
  url: string,
  overallScore: number,
  tier: 'free' | 'basic' | 'pro',
  L: PdfLabels,
) {
  // Mockup design: rounded card with margin, gradient background, white text.
  // Left column = subtitle / URL / generated meta, right column = overall score.
  const cardX = 28;
  const cardW = pageWidth - cardX * 2;
  const cardY = 22;
  const cardH = 78;
  const radius = 14;

  const theme = TIER_THEME[tier];
  const grad = doc.linearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  grad.stop(0, theme.from).stop(1, theme.to);
  doc.roundedRect(cardX, cardY, cardW, cardH, radius).fill(grad);

  const padX = 18;
  const padY = 14;
  const rightColW = 130;
  const leftX = cardX + padX;
  const leftW = cardW - padX * 2 - rightColW - 12;

  const subtitle = tier === 'pro' ? L.proReport : tier === 'basic' ? L.basicReport : L.freeReport;
  doc.fillColor('white').fontSize(7.5).font('BodyBold');
  const subtitleText = ellipsizeToWidth(doc, `SEO ANALYZER PRO · ${subtitle.toUpperCase()}`, leftW);
  doc.text(subtitleText, leftX, cardY + padY, { width: leftW, lineBreak: false });

  // URL — bold main heading. Pre-truncate to fit on one line.
  doc.fontSize(16).font('BodyBold');
  const urlText = ellipsizeToWidth(doc, url, leftW);
  doc.text(urlText, leftX, cardY + padY + 12, { width: leftW, lineBreak: false });

  doc.fontSize(8).font('Body');
  const meta = `${L.generated} ${new Date().toLocaleDateString(L.dateLocale)} · ${L.masterReport}`;
  const metaText = ellipsizeToWidth(doc, meta, leftW);
  doc.text(metaText, leftX, cardY + padY + 34, { width: leftW, lineBreak: false });

  // OVERALL score on the right (right-aligned column).
  const rightX = cardX + cardW - padX - rightColW;
  doc.fillColor('white').fontSize(7).font('Body')
     .text(L.overall.toUpperCase(), rightX, cardY + padY + 1, { width: rightColW, align: 'right', lineBreak: false });

  // Compose "{score}/100" right-aligned: measure the slash+100 first so we can
  // place the big score immediately to its left, vertically aligned to the top.
  doc.fontSize(11).font('Body');
  const slashW = doc.widthOfString('/100');
  doc.fontSize(28).font('BodyBold');
  const scoreStr = `${overallScore}`;
  const scoreW = doc.widthOfString(scoreStr);
  const totalW = scoreW + 2 + slashW;
  const groupX = rightX + rightColW - totalW;
  doc.fillColor('white').fontSize(28).font('BodyBold')
     .text(scoreStr, groupX, cardY + padY + 11, { width: scoreW + 2, align: 'left', lineBreak: false });
  doc.fontSize(11).font('Body')
     .text('/100', groupX + scoreW + 2, cardY + padY + 27, { width: slashW, align: 'left', lineBreak: false });

  doc.fillColor(colors.foreground);
  doc.y = cardY + cardH + 12;
}

function drawScoreDashboard(
  doc: InstanceType<typeof PDFDocument>,
  pageWidth: number,
  scores: { label: string; score: number; color: string }[],
  caption: string,
  L: PdfLabels,
) {
  const cardX = 40, cardW = pageWidth - 80;
  const cardY = doc.y;
  const cardH = 88;
  doc.roundedRect(cardX, cardY, cardW, cardH, 14).fillColor(colors.card).fill();
  doc.roundedRect(cardX, cardY, cardW, cardH, 14).strokeColor(colors.border).lineWidth(0.5).stroke();

  doc.fillColor(colors.foreground).fontSize(10).font('BodyBold')
     .text(L.overallDashboard, cardX + 14, cardY + 10, { lineBreak: false });
  doc.fillColor(colors.mutedForeground).fontSize(7).font('Body')
     .text(caption, cardX + 14, cardY + 11, { width: cardW - 28, align: 'right', lineBreak: false });

  if (scores.length > 0) {
    const r = 16;
    const startX = cardX + 30;
    const endX = cardX + cardW - 30;
    const spacing = (endX - startX) / Math.max(1, scores.length - 1);
    const cy = cardY + 46;
    scores.forEach((s, i) => {
      const cx = scores.length === 1 ? (startX + endX) / 2 : startX + i * spacing;
      drawScoreCircle(doc, cx, cy, r, s.score, s.label, s.color);
    });
  }
  doc.y = cardY + cardH + 10;
}

function drawKeyFindings(
  doc: InstanceType<typeof PDFDocument>,
  pageWidth: number,
  topIssues: { tool: string; issue: string; status: string }[],
  totalIssues: number,
  L: PdfLabels,
) {
  const cardX = 40, cardW = pageWidth - 80;
  const visible = topIssues.slice(0, 3);
  const hidden = Math.max(0, totalIssues - visible.length);
  // Stacked rows: tool name on top, issue below — both left-aligned just past
  // the severity pill. Larger row height to fit two lines without overlap.
  const stackedRowH = 26;
  const cardH = 38 + visible.length * stackedRowH + (hidden > 0 ? 18 : 8);

  ensureSpace(doc, cardH + 10);
  const cardY = doc.y;
  doc.roundedRect(cardX, cardY, cardW, cardH, 14).fillColor('#fff1f2').fill();
  doc.roundedRect(cardX, cardY, cardW, cardH, 14).strokeColor('#fecaca').lineWidth(1).stroke();

  doc.fillColor('#991b1b').fontSize(10).font('BodyBold')
     .text(`! ${L.keyFindings}`, cardX + 14, cardY + 10, { lineBreak: false });

  if (totalIssues > 0) {
    const badge = L.issuesFound(totalIssues);
    doc.fontSize(7);
    const bw = doc.widthOfString(badge) + 12;
    doc.roundedRect(cardX + cardW - bw - 14, cardY + 9, bw, 14, 7).fillColor('#ffffff').fill();
    doc.roundedRect(cardX + cardW - bw - 14, cardY + 9, bw, 14, 7).strokeColor('#fecaca').lineWidth(0.5).stroke();
    doc.fillColor('#991b1b').fontSize(7).font('BodyBold')
       .text(badge, cardX + cardW - bw - 14, cardY + 12, { width: bw, align: 'center', lineBreak: false });
  }

  if (visible.length === 0) {
    doc.fillColor('#16a34a').fontSize(9).font('Body')
       .text(L.noIssues, cardX + 14, cardY + 32, { width: cardW - 28 });
  } else {
    visible.forEach((it, i) => {
      const ry = cardY + 32 + i * stackedRowH;
      const pw = drawSeverityPill(doc, cardX + 14, ry, it.status, L);

      // Stacked layout: pill on the left, tool name on top, issue below.
      const textX = cardX + 14 + pw + 8;
      const textW = cardX + cardW - 14 - textX;

      doc.fontSize(8).font('BodyBold');
      const toolText = ellipsizeToWidth(doc, it.tool || '', textW);
      doc.fillColor(colors.foreground)
         .text(toolText, textX, ry, { width: textW, lineBreak: false });

      if (it.issue) {
        doc.fontSize(8).font('Body');
        const issueText = ellipsizeToWidth(doc, it.issue, textW);
        doc.fillColor(colors.mutedForeground)
           .text(issueText, textX, ry + 11, { width: textW, lineBreak: false });
      }
    });
    if (hidden > 0) {
      doc.fillColor(colors.mutedForeground).fontSize(8).font('BodyItalic')
         .text(L.moreHidden(hidden), cardX, cardY + cardH - 14, { width: cardW, align: 'center', lineBreak: false });
    }
  }
  doc.y = cardY + cardH + 10;
}

function drawLockedSectionPreview(
  doc: InstanceType<typeof PDFDocument>,
  pageWidth: number,
  toolKey: string,
  toolName: string,
  score: number,
  L: PdfLabels,
) {
  const cardX = 40, cardW = pageWidth - 80;
  const cardH = 56;
  ensureSpace(doc, cardH + 8);
  const y = doc.y;

  // Outer card
  doc.rect(cardX, y, cardW, cardH).fillColor(colors.card).fill()
     .strokeColor(colors.border).lineWidth(0.5).stroke();
  // Header strip
  doc.rect(cardX, y, cardW, 24).fillColor('#f8fafc').fill();
  doc.moveTo(cardX, y + 24).lineTo(cardX + cardW, y + 24).strokeColor(colors.border).lineWidth(0.5).stroke();

  const tColor = TOOL_COLORS[toolKey] || colors.primary;
  // Color square (icon placeholder)
  doc.rect(cardX + 10, y + 6, 12, 12).fillColor(tColor).fillOpacity(0.18).fill().fillOpacity(1);
  doc.rect(cardX + 14, y + 10, 4, 4).fillColor(tColor).fill();

  // Tool name
  doc.fillColor(colors.foreground).fontSize(10).font('BodyBold')
     .text(toolName, cardX + 30, y + 8, { width: cardW - 130, lineBreak: false, ellipsis: true });

  // Score pill on the right
  const pillText = L.sectionScore(score);
  doc.fontSize(8);
  const pw = doc.widthOfString(pillText) + 12;
  doc.rect(cardX + cardW - pw - 10, y + 6, pw, 14).fillColor(tColor).fillOpacity(0.15).fill().fillOpacity(1);
  doc.fillColor(tColor).fontSize(8).font('BodyBold')
     .text(pillText, cardX + cardW - pw - 10, y + 9, { width: pw, align: 'center', lineBreak: false });

  // Locked overlay strip
  doc.rect(cardX, y + 24, cardW, cardH - 24).fillColor('#fafafa').fill();
  doc.fillColor(colors.mutedForeground).fontSize(9).font('Body')
     .text(`${L.lockedTag}   ${L.fullDetailsLocked}`, cardX, y + 38, { width: cardW, align: 'center', lineBreak: false });

  doc.y = y + cardH + 6;
}

function drawUpgradeCTA(
  doc: InstanceType<typeof PDFDocument>,
  pageWidth: number,
  L: PdfLabels,
) {
  // Calm, low-key upsell card. White background + subtle border, neutral text,
  // restrained pricing tiles. No gradients, no shouty colors — matches the
  // visual language of the rest of the document.
  const cardX = 40, cardW = pageWidth - 80;
  const cardH = 118;
  ensureSpace(doc, cardH + 10);
  const y = doc.y;

  doc.roundedRect(cardX, y, cardW, cardH, 14).fillColor('#ffffff').fill();
  doc.roundedRect(cardX, y, cardW, cardH, 14).strokeColor('#e2e8f0').lineWidth(0.75).stroke();

  doc.fillColor(colors.foreground).fontSize(10).font('BodyBold')
     .text(L.unlockFullReport, cardX + 16, y + 12, { width: cardW - 32, lineBreak: false });
  doc.fillColor(colors.mutedForeground).fontSize(8).font('Body')
     .text(L.upgradePitch, cardX + 16, y + 27, { width: cardW - 32 });

  // Two pricing tiles
  const tileGap = 12;
  const tileW = (cardW - 32 - tileGap) / 2;
  const tileY = y + 54;
  const tileH = 46;

  // Basic tile — flat neutral
  doc.roundedRect(cardX + 16, tileY, tileW, tileH, 10).fillColor('#f8fafc').fill();
  doc.roundedRect(cardX + 16, tileY, tileW, tileH, 10).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
  doc.fillColor(colors.mutedForeground).fontSize(7).font('BodyBold')
     .text(L.tierBasicLabel.toUpperCase(), cardX + 24, tileY + 7, { lineBreak: false });
  doc.fillColor(colors.foreground).fontSize(15).font('BodyBold')
     .text('€19', cardX + 24, tileY + 16, { lineBreak: false });
  doc.fontSize(7).font('Body').fillColor(colors.mutedForeground);
  const basicDesc = ellipsizeToWidth(doc, L.basicDesc, tileW - 16);
  doc.text(basicDesc, cardX + 24, tileY + 33, { width: tileW - 16, lineBreak: false });

  // Pro tile — soft lavender accent (consistent with Pro inline-fix panels)
  const proX = cardX + 16 + tileW + tileGap;
  doc.roundedRect(proX, tileY, tileW, tileH, 10).fillColor('#f5f3ff').fill();
  doc.roundedRect(proX, tileY, tileW, tileH, 10).strokeColor('#ddd6fe').lineWidth(0.5).stroke();
  doc.fillColor('#6d28d9').fontSize(7).font('BodyBold')
     .text(L.tierProLabel.toUpperCase(), proX + 8, tileY + 7, { lineBreak: false });
  doc.fillColor(colors.foreground).fontSize(15).font('BodyBold')
     .text('€29', proX + 8, tileY + 16, { lineBreak: false });
  doc.fontSize(7).font('Body').fillColor(colors.mutedForeground);
  const proDesc = ellipsizeToWidth(doc, L.proDesc, tileW - 16);
  doc.text(proDesc, proX + 8, tileY + 33, { width: tileW - 16, lineBreak: false });

  doc.fontSize(8).font('BodyBold').fillColor(colors.primary)
     .text(L.upgradeNow, cardX + 16, y + cardH - 16, { width: cardW - 32, lineBreak: false });

  doc.fillColor(colors.foreground);
  doc.y = y + cardH + 10;
}

function drawSoftProUpsell(
  doc: InstanceType<typeof PDFDocument>,
  pageWidth: number,
  L: PdfLabels,
) {
  const cardX = 40, cardW = pageWidth - 80;
  const cardH = 54;
  ensureSpace(doc, cardH + 10);
  const y = doc.y;
  doc.roundedRect(cardX, y, cardW, cardH, 14).fillColor('#f5f3ff').fill();
  doc.roundedRect(cardX, y, cardW, cardH, 14).strokeColor('#ddd6fe').lineWidth(1).stroke();
  doc.fillColor('#5b21b6').fontSize(9).font('BodyBold')
     .text(`★ ${L.wantFixes}`, cardX + 14, y + 11, { width: cardW - 28, lineBreak: false });
  doc.fillColor('#6d28d9').fontSize(8).font('Body')
     .text(L.upsellPro, cardX + 14, y + 25, { width: cardW - 28 });
  doc.y = y + cardH + 8;
}

function drawProFixPanel(
  doc: InstanceType<typeof PDFDocument>,
  pageWidth: number,
  recommendations: any[],
  L: PdfLabels,
) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) return;
  const cardX = 40, cardW = pageWidth - 80;
  const padX = 12, padY = 8;
  const innerW = cardW - padX * 2; // text column inside the card
  const items = recommendations.slice(0, 5);

  items.forEach((rec, idx) => {
    // Recommendations come in two shapes:
    //   1. Object: { title, description, ... } from analyzers (SEO/AEO/GEO/Ads)
    //   2. String: full text incl. code blocks from siteTools (image opt, sitemap)
    // For strings, split the first line as the title and the rest as the
    // description so the code example renders in the smaller body font instead
    // of being squashed into a single-line title slot.
    let rawTitle: string;
    let rawDescription: string;
    if (typeof rec === 'string') {
      const newlineAt = rec.indexOf('\n');
      if (newlineAt > 0) {
        rawTitle = rec.slice(0, newlineAt).trim();
        rawDescription = rec.slice(newlineAt + 1).replace(/^\n+/, '');
      } else {
        rawTitle = rec;
        rawDescription = '';
      }
    } else if (rec && typeof rec === 'object') {
      rawTitle = (rec.title || rec.name || `Fix #${idx + 1}`).toString();
      rawDescription = (rec.description || rec.action || rec.recommendation || '').toString();
    } else {
      return;
    }
    const title = wrapLongTokens(rawTitle);
    const description = wrapLongTokens(rawDescription);

    // MEASURE both title and description with the SAME width and font they'll
    // be rendered with — title can wrap to multiple lines for long fix titles.
    // Cap heights against the printable area on a fresh page so a pathological
    // long title + huge code example can never produce a card that overflows
    // the page bounds. Both the title and the description get bounded heights;
    // the description text() call uses ellipsis to terminate cleanly.
    const titleText = `${L.fixLabel} ${title}`;
    const printableH = Math.max(0, doc.page.height - doc.page.margins.top - doc.page.margins.bottom - 40);
    doc.fontSize(9).font('BodyBold');
    const titleRawH = doc.heightOfString(titleText, { width: innerW });
    const maxTitleH = Math.max(20, Math.floor(printableH * 0.4));
    const titleH = Math.min(titleRawH, maxTitleH);
    doc.fontSize(8).font('Body');
    const descRawH = description ? doc.heightOfString(description, { width: innerW }) : 0;
    const maxDescH = Math.max(0, printableH - (padY + titleH + 4 + padY));
    const descH = Math.min(descRawH, maxDescH);
    const blockH = padY + titleH + (descH ? 4 + descH : 0) + padY;

    // ensureSpace BEFORE drawing so we never split a fix card mid-paint.
    ensureSpace(doc, blockH + 6);
    const y = doc.y;
    // Rounded lavender background with left purple accent stripe
    doc.roundedRect(cardX, y, cardW, blockH, 12).fillColor('#faf5ff').fill();
    doc.roundedRect(cardX, y, cardW, blockH, 12).strokeColor('#e9d5ff').lineWidth(0.5).stroke();
    doc.rect(cardX + 1, y + 1, 3, blockH - 2).fillColor('#a855f7').fill();

    // Title (height-bounded with ellipsis so a pathological long title can't
    // push the description off-page).
    doc.fillColor('#6b21a8').fontSize(9).font('BodyBold')
       .text(titleText, cardX + padX, y + padY, { width: innerW, height: titleH, ellipsis: true });
    // Description (ellipsized if it would overflow maxDescH)
    if (description) {
      doc.fillColor('#581c87').fontSize(8).font('Body')
         .text(description, cardX + padX, y + padY + titleH + 4, {
           width: innerW,
           height: descH,
           ellipsis: true,
         });
    }
    doc.y = y + blockH + 4;
  });
  doc.moveDown(0.4);
}

export async function generateMasterPdfReport(data: MasterResult, tier: 'free' | 'basic' | 'pro' = 'pro', lang: Lang = 'en'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const L = PDF_LABELS[lang] || PDF_LABELS.en;
      const doc = new PDFDocument({
        margin: 30,
        size: 'A4',
        bufferPages: true,
        info: {
          Title: `Master SEO Report - ${data.url}`,
          Author: 'SiteSnap',
          Subject: L.metaSubject,
          Keywords: 'SEO, AEO, Ads, Analysis, Optimization'
        }
      });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Register Inter under Body/BodyBold/BodyItalic. Inter covers Croatian
      // diacritics (č, ć, š, ž, đ) and matches the canvas mockup design.
      try {
        registerInterFonts(doc);
      } catch {
        // Fall back silently if Inter fonts are unavailable.
      }

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 80;

      // Build per-tool score list (used by all tiers)
      const toolList: { key: keyof typeof L.toolNames; score: number; data: any }[] = [];
      if (data.seo?.data)              toolList.push({ key: 'seo',      score: data.seo.data.overallScore ?? 0,           data: data.seo.data });
      if (data.ads?.data)              toolList.push({ key: 'ads',      score: data.ads.data.results?.score ?? 0,         data: data.ads.data });
      if (data.aeo?.data)              toolList.push({ key: 'aeo',      score: data.aeo.data.results?.score ?? 0,         data: data.aeo.data });
      if (data.geo?.data)              toolList.push({ key: 'geo',      score: data.geo.data.results?.score ?? 0,         data: data.geo.data });
      if (data.brokenLinks?.data)      toolList.push({ key: 'links',    score: data.brokenLinks.data.score ?? 0,          data: data.brokenLinks.data });
      if (data.imageOptimization?.data)toolList.push({ key: 'images',   score: data.imageOptimization.data.score ?? 0,    data: data.imageOptimization.data });
      if (data.internalLinking?.data)  toolList.push({ key: 'internal', score: data.internalLinking.data.score ?? 0,      data: data.internalLinking.data });
      if (data.sitemapValidator?.data) toolList.push({ key: 'sitemap',  score: data.sitemapValidator.data.score ?? 0,     data: data.sitemapValidator.data });

      const overallAvg = toolList.length > 0
        ? Math.round(toolList.reduce((s, t) => s + t.score, 0) / toolList.length)
        : 0;
      const dashboardScores = toolList.map(t => ({
        label: L.toolNames[t.key],
        score: t.score,
        color: TOOL_COLORS[t.key],
      }));

      // ── HEADER (tier-themed gradient) ──
      drawTierHeader(doc, pageWidth, data.url, overallAvg, tier, L);

      // ── OVERALL SCORE DASHBOARD (always shown) ──
      const dashboardCaption = tier === 'pro' ? L.fullDataPlusFixes
        : tier === 'basic' ? L.fullDataIncluded
        : L.snapshot;
      drawScoreDashboard(doc, pageWidth, dashboardScores, dashboardCaption, L);

      // ─────────────────────────────────────────────────────
      // FREE TIER → key findings + locked section previews + CTA
      // ─────────────────────────────────────────────────────
      if (tier === 'free') {
        // Collect issues from all 8 tools by reusing getToolChecks(), the
        // single source of truth for schema-to-PDF field resolution. This
        // prevents drift: the section cards below and the Key Findings card
        // always agree on which rows exist for each tool.
        const issues: { tool: string; issue: string; status: string }[] = [];
        toolList.forEach(t => {
          const toolName = L.toolNames[t.key];
          const checks = getToolChecks(t.key, t.data, L);
          checks.forEach(c => {
            if (c.status === 'FAIL' || c.status === 'WARNING') {
              issues.push({ tool: toolName, issue: c.name || L.issueDetected, status: c.status });
            }
          });
        });
        // Sort: critical/fail before warning, so first 3 are the worst
        issues.sort((a, b) => {
          const rank = (s: string) => (s === 'FAIL' || s === 'CRITICAL' || s === 'ERROR') ? 0 : 1;
          return rank(a.status) - rank(b.status);
        });

        drawKeyFindings(doc, pageWidth, issues, issues.length, L);

        // Detailed Section Breakdown header (no longer locked — shows top 3 per section)
        ensureSpace(doc, 30);
        const dbY = doc.y;
        doc.fillColor(colors.foreground).fontSize(12).font('BodyBold')
           .text(L.detailedBreakdown, 40, dbY, { lineBreak: false });
        doc.y = dbY + 22;

        // Per-section card with up to 3 prioritized findings (matches website)
        toolList.forEach(t => {
          const checks = getToolChecks(t.key, t.data, L);
          drawFreeFindingsCard(doc, pageWidth, t.key, L.toolNames[t.key], t.score, checks, L);
        });

        // Big upgrade CTA at the end
        drawUpgradeCTA(doc, pageWidth, L);

        addMasterFooter(doc, data.url, L.pageLabel);
        doc.end();
        return;
      }

      // ─────────────────────────────────────────────────────
      // BASIC + PRO → mockup-style sections
      // For each tool, renderToolSection draws ONE rounded section card:
      //   • drawSectionHeadStrip (gray top strip with icon chip + tool name
      //     + counts + score pill; outlined corners clip the flat strip)
      //   • mockup check rows from getToolChecks(), separated by dashed
      //     dividers, all inside the same card
      //   • Pro only: per-check inline fix panel (drawProInlineFix) rendered
      //     flat inside the card directly under the check that produced it
      //   • Pro only: tool-level recommendations rendered AFTER the section
      //     card via drawProFixPanel
      // ─────────────────────────────────────────────────────
      const showFixes = tier === 'pro';

      // Renders one tool as a single rounded section card matching the canvas
      // mockup: gray header strip on top + check rows separated by dashed
      // dividers inside a 14px rounded outline. Pro mode interleaves a flat
      // lavender fix panel after each non-PASS check that has a per-check
      // recommendation.
      //
      // Layout strategy:
      //  • Pre-measure all child block heights for the tool.
      //  • If the whole card fits on the remaining page, draw it as one unit.
      //  • Otherwise page-break first; if it STILL doesn't fit on a fresh
      //    page (very long tool), fall back to drawing per-page chunks each
      //    with their own outline + repeated header strip.
      const renderToolSection = (
        toolKey: string,
        toolName: string,
        score: number,
        sourceData: any,
        toolLevelRecs: any[] | undefined,
      ) => {
        const checks = getToolChecks(toolKey, sourceData, L);
        const counts = checks.length > 0 ? countChecks(checks) : null;
        const cardX = 40;
        const cardW = pageWidth - 80;
        const cardR = 14;
        const headH = 28;
        const bodyTopPad = 4;
        const bodyBotPad = 6;
        const dividerGap = 0; // dashed divider drawn directly between rows

        // Pre-measure each block (row + optional inline fix). dividerGap is
        // the space between rows for the dashed line.
        type Block = { kind: 'row'; h: number; data: typeof checks[number] }
                   | { kind: 'fix'; h: number; rec: string };
        const blocks: Block[] = [];
        if (checks.length === 0) {
          blocks.push({ kind: 'row', h: 22, data: { name: '', status: 'PASS', details: '' } });
        } else {
          checks.forEach((c) => {
            const rh = measureCheckRowH(doc, c, cardW, L);
            blocks.push({ kind: 'row', h: rh, data: c });
            if (showFixes && c.recommendation && String(c.status).toUpperCase() !== 'PASS') {
              const fh = measureProInlineFixH(doc, c.recommendation, cardW);
              blocks.push({ kind: 'fix', h: fh, rec: c.recommendation });
            }
          });
        }

        const bodyH = blocks.reduce((s, b) => s + b.h, 0) + bodyTopPad + bodyBotPad;
        const totalCardH = headH + bodyH;

        // Pack content tight: if the whole card fits on the CURRENT page,
        // draw it as one unit; otherwise chunk it across pages starting from
        // the current Y. This avoids wasting blank space at the bottom of
        // pages (the previous "page-break to a fresh page first" path left
        // huge gaps when a tool was just slightly too tall to fit).
        //
        // Only force a fresh page when the current page can't even fit the
        // header + first block (chunking with too little space would produce
        // an awkward 2-line stub).
        const minChunkH = headH + bodyTopPad + (blocks[0]?.h || 22) + bodyBotPad;
        if (doc.y + minChunkH > doc.page.height - 60) {
          doc.addPage();
          doc.y = 40;
        }
        const pageBudget = doc.page.height - 60 - doc.y;
        const splitNeeded = totalCardH > pageBudget;

        if (!splitNeeded) {
          // ─── Single-card path (typical case) ───
          const cardY = doc.y;
          // Outer rounded outline + white fill
          doc.roundedRect(cardX, cardY, cardW, totalCardH, cardR).fillColor('#ffffff').fill();
          // Header strip (paints over the rounded fill — cosmetic; the
          // rounded corners stay because the gray strip is visually masked
          // by the outline below it once stroked)
          drawSectionHeadStrip(doc, cardX, cardY, cardW, headH, toolKey, toolName, score, counts, L);
          // Re-draw the rounded outline ON TOP so the head strip's flat
          // corners get visually clipped by the outline.
          doc.roundedRect(cardX, cardY, cardW, totalCardH, cardR)
             .strokeColor('#e2e8f0').lineWidth(0.75).stroke();

          // Body content
          let by = cardY + headH + bodyTopPad;
          if (checks.length === 0) {
            doc.fillColor(colors.mutedForeground).fontSize(9).font('BodyItalic')
               .text(L.noIssues, cardX, by + 4, { width: cardW, align: 'center', lineBreak: false });
          } else {
            blocks.forEach((b, i) => {
              if (b.kind === 'row') drawCheckRow(doc, cardX, by, cardW, b.data, L);
              else drawProInlineFix(doc, cardX, by, cardW, b.rec, L);
              by += b.h;
              // Dashed divider between this block and the next, but ONLY
              // between two row-blocks (so a fix panel doesn't get a divider
              // on top — it sits flush against its preceding row).
              const next = blocks[i + 1];
              if (next && b.kind === 'row' && next.kind === 'row') {
                doc.save();
                doc.dash(2, { space: 2 })
                   .moveTo(cardX + 14, by - 0.5).lineTo(cardX + cardW - 14, by - 0.5)
                   .strokeColor('#e2e8f0').lineWidth(0.5).stroke();
                doc.undash();
                doc.restore();
              }
            });
          }

          doc.y = cardY + totalCardH + 10;
        } else {
          // ─── Multi-page split path ───
          // Draw a header + as many blocks as fit per page, with each chunk
          // wrapped in its own rounded outline. Repeat the header strip on
          // each chunk so the user always sees the tool context.
          let i = 0;
          while (i < blocks.length) {
            const chunkStart = i;
            const startY = doc.y;
            let chunkH = headH + bodyTopPad;
            // Greedily add blocks until we run out of page space, leaving
            // bodyBotPad for the closing pad.
            const budget = doc.page.height - 60 - startY - bodyBotPad;
            while (i < blocks.length && chunkH + blocks[i].h <= budget) {
              chunkH += blocks[i].h;
              i++;
            }
            // Edge case: even one block doesn't fit on a fresh page — draw
            // it anyway and let it overflow (extremely long single fix).
            if (i === chunkStart) {
              chunkH += blocks[i].h;
              i++;
            }
            chunkH += bodyBotPad;

            // Outer outline + head strip + outline overlay
            doc.roundedRect(cardX, startY, cardW, chunkH, cardR).fillColor('#ffffff').fill();
            drawSectionHeadStrip(doc, cardX, startY, cardW, headH, toolKey, toolName, score, counts, L);
            doc.roundedRect(cardX, startY, cardW, chunkH, cardR)
               .strokeColor('#e2e8f0').lineWidth(0.75).stroke();

            // Body
            let by = startY + headH + bodyTopPad;
            for (let k = chunkStart; k < i; k++) {
              const b = blocks[k];
              if (b.kind === 'row') drawCheckRow(doc, cardX, by, cardW, b.data, L);
              else drawProInlineFix(doc, cardX, by, cardW, b.rec, L);
              by += b.h;
              const next = blocks[k + 1];
              if (k + 1 < i && b.kind === 'row' && next && next.kind === 'row') {
                doc.save();
                doc.dash(2, { space: 2 })
                   .moveTo(cardX + 14, by - 0.5).lineTo(cardX + cardW - 14, by - 0.5)
                   .strokeColor('#e2e8f0').lineWidth(0.5).stroke();
                doc.undash();
                doc.restore();
              }
            }

            doc.y = startY + chunkH + 10;
            // If more blocks remain, force a page-break sized to the actual
            // next block — using a fixed `headH + 60` budget is unsafe when
            // a single check row + Pro fix is taller than 60pt and would
            // overflow even though it would have fit on a fresh page.
            if (i < blocks.length) {
              const nextBlock = blocks[i];
              const minNeeded = headH + bodyTopPad + nextBlock.h + bodyBotPad;
              if (doc.y + minNeeded > doc.page.height - 60) {
                doc.addPage();
              }
            }
          }
        }

        // Pro: tool-level recommendations follow the section card
        if (showFixes && Array.isArray(toolLevelRecs) && toolLevelRecs.length > 0) {
          drawProFixPanel(doc, pageWidth, toolLevelRecs, L);
        }
        doc.moveDown(0.2);
      };

      if (data.seo?.data) {
        renderToolSection('seo', L.toolNames.seo, data.seo.data.overallScore ?? 0, data.seo.data, data.seo.data.recommendations);
      }
      if (data.ads?.data) {
        renderToolSection('ads', L.toolNames.ads, data.ads.data.results?.score ?? 0, data.ads.data, data.ads.data.recommendations);
      }
      if (data.aeo?.data) {
        renderToolSection('aeo', L.toolNames.aeo, data.aeo.data.results?.score ?? 0, data.aeo.data, data.aeo.data.recommendations);
      }
      if (data.geo?.data) {
        renderToolSection('geo', L.toolNames.geo, data.geo.data.results?.score ?? 0, data.geo.data, data.geo.data.recommendations);
      }
      if (data.brokenLinks?.data) {
        renderToolSection('links', L.toolNames.links, data.brokenLinks.data.score ?? 0, data.brokenLinks.data, data.brokenLinks.data.recommendations);
      }
      if (data.imageOptimization?.data) {
        renderToolSection('images', L.toolNames.images, data.imageOptimization.data.score ?? 0, data.imageOptimization.data, data.imageOptimization.data.recommendations);
      }
      if (data.internalLinking?.data) {
        renderToolSection('internal', L.toolNames.internal, data.internalLinking.data.score ?? 0, data.internalLinking.data, data.internalLinking.data.recommendations);
      }
      if (data.sitemapValidator?.data) {
        renderToolSection('sitemap', L.toolNames.sitemap, data.sitemapValidator.data.score ?? 0, data.sitemapValidator.data, data.sitemapValidator.data.recommendations);
      }

      // ── BASIC: soft Pro upsell at the end ──
      if (tier === 'basic') {
        drawSoftProUpsell(doc, pageWidth, L);
      }

      // ── FOOTER on every page ──
      addMasterFooter(doc, data.url, L.pageLabel);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
