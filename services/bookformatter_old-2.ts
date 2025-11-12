import type { Book, BookPart } from '../types';

/* ================================
   ORIGINAL HELPER: formatContentForHTML
   ================================ */
const formatContentForHTML = (text: string, addIndent = true): string => {
  if (!text || typeof text !== 'string') return '';
  const paragraphs = text.split('\n').filter(p => p.trim() !== '');
  if (paragraphs.length === 0) return '';
  let html = `<p class="font-merriweather ${addIndent ? 'indent' : ''}">${paragraphs[0].trim()}</p>`;
  for (let i = 1; i < paragraphs.length; i++) {
    html += `<p class="font-merriweather indent">${paragraphs[i].trim()}</p>`;
  }
  return html;
};

/* ================================
   ORIGINAL HELPER: balanceText
   ================================ */
const balanceText = (text: string, maxLines: number): string => {
  if (!text || typeof text !== 'string') return '';
  const words = text.split(' ').filter(w => w.length > 0);
  if (words.length === 0) return text;
  const effectiveLines = Math.min(maxLines, Math.ceil(words.length / 2.5));
  if (effectiveLines <= 1) return text;
  const wordsPerLine = Math.ceil(words.length / effectiveLines);
  const lines = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(' '));
  }
  return lines.join('<br>');
};

/* ============================================================
   NOVO BLOCO DE ESTILOS AJUSTADO PARA FORMATO A5 DIGITAL
   (Mantém o original preservado)
   ============================================================ */
const getStyles = () => `
<style>
  @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Merriweather:wght@300;400;700;900&family=Merriweather+Sans:wght@300;400;600;700&display=swap');

  /* === ORIGINAL BODY / PAGE CONTAINER ===
  body { font-family: 'Merriweather', serif; font-size: 12.5pt; font-weight: 300; color: #262626; margin: 0; }
  .page-container { width: 14.8cm; position: relative; background: white; }
  .page-container-fixed { height: 20.95cm; display: flex; flex-direction: column; }
  ======================================== */

  /* === NOVO: PADRÃO A5 DIGITAL === */
  body {
    font-family: 'Merriweather', serif;
    font-size: 12.5pt;
    color: #262626;
    margin: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page-container {
    width: 14.8cm;
    height: auto;
    position: relative;
    box-sizing: border-box;
    background: white;
    page-break-inside: avoid;
  }

  .page-container-fixed {
    min-height: 19.8cm;
    display: flex;.0
    flex-direction: column;
    justify-content: center;
  }

  /* === CAPA === */
  .cover-page {
    text-align: center;
    position: relative;
    background: linear-gradient(to bottom right, rgba(255, 245, 225, 0.1), rgba(10, 207, 131, 0.1));
    page-break-after: avoid; /* evita página em branco */
  }
  .cover-page .content-wrapper {
    position: relative;
    z-index: 10;
    height: 100%;
    width: 100%;
  }
  .cover-page .title, .cover-page .subtitle, .cover-page .author {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    padding: 0 1cm;
    box-sizing: border-box;
  }
  .cover-page .title { font-family: 'League Gothic', sans-serif; font-size: 4.5rem; text-transform: uppercase; margin: 0; line-height: 1.1; color: #0d47a1; top: 30mm; }
  .cover-page .subtitle { font-family: 'Merriweather Sans', sans-serif; font-size: 1.125rem; font-weight: 300; color: #212121; top: 100mm; }
  .cover-page .author { font-family: 'Merriweather Sans', sans-serif; font-size: 1rem; font-weight: 400; color: #212121; top: 140mm; }
  .onda { position: absolute; top: 155mm; width: 200%; height: 100mm; left: -50%; border-radius: 45%; z-index: 1; }
  .onda1 { background: linear-gradient(90deg, #0052A5 0%, #0ACF83 100%); transform: rotate(-8deg); }
  .onda2 { background: linear-gradient(90deg, #0ACF83 0%, #0052A5 100%); opacity: 0.75; transform: rotate(-5deg); }
  .onda3 { background: linear-gradient(90deg, #0077FF 0%, #00FFB3 100%); opacity: 0.5; transform: rotate(-2deg); }

  /* === CRÉDITOS === */
  /* ORIGINAL:
  .copyright-page { justify-content: flex-end; padding: 2cm; }
  ======================================== */
  .copyright-page {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 21cm;
    padding: 0 2cm;
    text-align: center;
    box-sizing: border-box;
    page-break-before: avoid;
    page-break-after: avoid;
  }
  .copyright-page .content {
    font-family: 'Merriweather Sans', sans-serif;
    font-size: 9pt;
    color: #595959;
    line-height: 1.5;
    max-width: 10cm;
    margin: 0 auto;
  }

  /* === CONTEÚDO PRINCIPAL === */
  .content-body h1 { font-family: 'Merriweather', serif; font-weight: 700; font-size: 28pt; margin-bottom: 1.5em; color: #333; text-align: left; page-break-after: avoid; }
  .content-body h2 { font-family: 'Merriweather', serif; font-weight: 700; font-size: 22pt; margin-top: 1.5em; margin-bottom: 1em; color: #333; page-break-after: avoid; }
  .content-body h3 { font-family: 'Merriweather Sans', sans-serif; font-weight: 700; font-size: 16pt; margin-top: 1.5em; margin-bottom: 0.5em; color: #444; page-break-after: avoid; }
  .content-body p { line-height: 1.6; margin: 0 0 1em 0; text-align: justify; }
  .content-body p.indent { text-indent: 1.5em; }

  .toc-item { font-family: 'Merriweather Sans', sans-serif; margin-bottom: 4pt; line-height: 1.6; }
  .toc-chapter { font-weight: 700; margin-top: 8pt; }
  .toc-subchapter { margin-left: 20px; }

  .chapter-title-page { display: flex; justify-content: center; align-items: center; text-align: center; }
  .chapter-title-page h1 { font-family: 'Merriweather', serif; font-size: 26pt; font-weight: 300; }
</style>
`;

/* ================================
   GERAÇÃO DE PARTES DO LIVRO
   ================================ */
export const getPartHtmlContent = (book: Book, part: BookPart): string => {
  let content;
  try {
    content = JSON.parse(part.content);
  } catch {
    content = { content: part.content };
  }
  const isFixedPage = ['cover', 'copyright', 'chapter_title'].includes(part.part_type);
  const containerClass = `page-container ${isFixedPage ? 'page-container-fixed' : ''}`;
  switch (part.part_type) {
    case 'cover':
      return `<div class="${containerClass} cover-page"><div class="content-wrapper"><h1 class="title">${balanceText(content.title, 3)}</h1><p class="subtitle">${balanceText(content.subtitle, 3)}</p><p class="author">${content.author}</p></div><div class="onda onda1"></div><div class="onda onda2"></div><div class="onda onda3"></div></div>`;
    case 'copyright':
      const copyrightText = typeof content === 'string' ? content : (content.content || `Copyright © ${new Date().getFullYear()} ${book.author}`);
      return `<div class="${containerClass} copyright-page"><div class="content"><p>${copyrightText}</p><p>Todos os direitos reservados.</p><p>Este livro ou qualquer parte dele não pode ser reproduzido ou usado de forma alguma sem a permissão expressa por escrito do editor, exceto pelo uso de breves citações em uma resenha do livro.</p></div></div>`;
    case 'toc':
      return `<div class="${containerClass}"><div class="content-body" style="padding: 2.4cm 2cm 2.7cm 2cm;"><h1>${content.title}</h1>${content.content.split('\n').map((line: string) => {
        line = line.trim();
        if (!line) return '';
        if (line.match(/^capítulo \d+:/i)) {
          return `<p class="toc-item toc-chapter">${line}</p>`;
        }
        return `<p class="toc-item toc-subchapter">${line}</p>`;
      }).join('')}</div></div>`;
    case 'introduction':
    case 'conclusion':
      return `<div class="${containerClass}"><div class="content-body" style="padding: 2.4cm 2cm 2.7cm 2cm;"><h1>${content.title}</h1>${formatContentForHTML(content.content, true)}</div></div>`;
    case 'chapter_title':
      return `<div class="${containerClass} chapter-title-page"><h1>${balanceText(content.title, 3)}</h1></div>`;
    case 'chapter_content':
      return `<div class="${containerClass}"><div class="content-body" style="padding: 2.4cm 2cm 2.7cm 2cm;"><h2 class="font-merriweather">${content.title}</h2>${formatContentForHTML(content.introduction, false)}${content.subchapters.map((sub: any) => `<h3 class="font-merriweather-sans">${sub.title}</h3>${formatContentForHTML(sub.content)}`).join('')}</div></div>`;
    default:
      return '';
  }
};

/* ================================
   MONTAGEM FINAL DO LIVRO
   ================================ */
export const assemblePartHtml = (book: Book, part: BookPart): string => {
  const partContent = getPartHtmlContent(book, part);
  return `<html><head><title>${book.title}</title>${getStyles()}</head><body>${partContent}</body></html>`;
};

export const assembleFullHtml = (book: Book, parts: BookPart[]): string => {
  let htmlContent = '';
  parts.sort((a, b) => a.part_index - b.part_index).forEach(part => {
    htmlContent += getPartHtmlContent(book, part)
      .replace('class="page-container', 'style="page-break-after: always; border-bottom: 2px dashed #ccc;" class="page-container');
  });
  return `<html><head><title>${book.title}</title>${getStyles()}</head><body>${htmlContent}</body></html>`;
};
