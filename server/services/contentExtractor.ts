import type * as cheerio from "cheerio";

export function extractMainContent($: cheerio.CheerioAPI): string {
  const clone = $.root().clone();

  clone.find('nav, header, footer, aside, script, style, noscript, iframe, svg, [role="navigation"], [role="banner"], [role="contentinfo"], .nav, .navbar, .header, .footer, .sidebar, .menu, .cookie, .cookie-banner, .cookie-consent, .breadcrumb, .pagination, #nav, #header, #footer, #sidebar, #menu').remove();

  const mainContent = clone.find('main, [role="main"], article, .content, .post, .entry, #content, #main').first();

  let text: string;
  if (mainContent.length > 0) {
    text = mainContent.text();
  } else {
    text = clone.find('body').text();
  }

  return text.replace(/\s+/g, ' ').trim();
}

export function extractParagraphs($: cheerio.CheerioAPI): string[] {
  const mainContent = $('main, [role="main"], article, .content, .post, .entry, #content, #main').first();
  const scope = mainContent.length > 0 ? mainContent : $('body');

  const paragraphs: string[] = [];

  scope.find('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) {
      paragraphs.push(text);
    }
  });

  if (paragraphs.length < 3) {
    scope.find('div').each((_, el) => {
      const div = $(el);
      if (div.children('div, p, ul, ol, table, section, article').length === 0) {
        const text = div.text().trim();
        if (text.length > 30 && text.split(/\s+/).length >= 8) {
          paragraphs.push(text);
        }
      }
    });
  }

  return paragraphs;
}

export function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^\p{L}]/gu, '');
  if (word.length <= 3) return 1;
  let count = 0;
  const vowels = 'aeiouyàáâãäåæèéêëìíîïòóôõöùúûüýÿąęįųāēīōūăĕĭŏŭ';
  let prevVowel = false;
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }
  if (word.endsWith('e') && count > 1) count--;
  return Math.max(1, count);
}

export function isContentWord(word: string): boolean {
  return /^\p{L}[\p{L}'-]*$/u.test(word);
}

export function detectIsEnglish(words: string[]): boolean {
  const commonEnglish = new Set([
    'the','a','an','is','are','was','were','be','been','being',
    'have','has','had','do','does','did','will','would','shall','should',
    'can','could','may','might','must','and','or','but','in','on',
    'at','to','for','of','with','by','from','as','into','through',
    'this','that','these','those','it','its','not','no','if','then',
    'than','so','very','just','about','up','out','all','each','every',
    'your','you','we','they','he','she','our','their','my','his','her',
  ]);
  const sample = words.slice(0, 200).map(w => w.toLowerCase());
  const matches = sample.filter(w => commonEnglish.has(w)).length;
  return sample.length > 0 && (matches / sample.length) > 0.12;
}

export function computeReadabilityScore(contentWords: string[], sentences: string[]): number {
  const totalWords = contentWords.length;
  if (totalWords === 0 || sentences.length === 0) return 0;

  const isEnglish = detectIsEnglish(contentWords);

  if (isEnglish) {
    const syllableCount = contentWords.reduce((sum, w) => sum + countSyllables(w), 0);
    return Math.max(0, Math.min(100, Math.round(
      206.835 - 1.015 * (totalWords / sentences.length) - 84.6 * (syllableCount / totalWords)
    )));
  }

  const avgSentLen = totalWords / sentences.length;
  const avgWordLen = contentWords.reduce((sum, w) => sum + w.length, 0) / totalWords;

  let score = 60;

  if (avgSentLen <= 12) score += 15;
  else if (avgSentLen <= 17) score += 10;
  else if (avgSentLen <= 22) score += 0;
  else if (avgSentLen <= 28) score -= 15;
  else score -= 30;

  if (avgWordLen <= 5) score += 5;
  else if (avgWordLen <= 7) score += 0;
  else if (avgWordLen <= 9) score -= 5;
  else score -= 15;

  const shortSentences = sentences.filter(s => s.trim().split(/\s+/).length <= 20).length;
  const shortRatio = shortSentences / sentences.length;
  if (shortRatio >= 0.7) score += 10;
  else if (shortRatio >= 0.5) score += 5;

  const sentLengths = sentences.map(s => s.trim().split(/\s+/).length);
  const meanLen = sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length;
  const variance = sentLengths.reduce((sum, l) => sum + Math.pow(l - meanLen, 2), 0) / sentLengths.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev > 3 && stdDev < 15) score += 5;

  return Math.max(5, Math.min(95, Math.round(score)));
}
