import type { Book, BookPart } from '../types';

// Helper to format paragraphs from a raw string into HTML paragraphs
const formatContentForHTML = (text: string, addIndent = true): string => {
  if (!text || typeof text !== 'string') return '';
  const paragraphs = text.split('\n').filter(p => p.trim() !== '');
  if (paragraphs.length === 0) return '';
  
  // First paragraph might not have an indent (e.g., after a subchapter title)
  let html = `<p class="font-merriweather ${addIndent ? 'indent' : ''}">${paragraphs[0].trim()}</p>`;
  // Subsequent paragraphs always get an indent
  for (let i = 1; i < paragraphs.length; i++) {
      html += `<p class="font-merriweather indent">${paragraphs[i].trim()}</p>`;
  }
  return html;
};

const getStyles = () => `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Merriweather:wght@300;400;700;900&family=Merriweather+Sans:wght@300;400;600;700&display=swap');
        body { font-family: 'Merriweather', serif; font-size: 11pt; font-weight: 300; color: #262626; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-container { width: 14.8cm; height: 21cm; position: relative; box-sizing: border-box; background: white; overflow: hidden; display: flex; flex-direction: column; }
        .cover-page { text-align: center; position: relative; background: linear-gradient(to bottom right, rgba(255, 245, 225, 0.1) 0%, rgba(10, 207, 131, 0.1) 100%); }
        .cover-page .content-wrapper { position: relative; z-index: 10; height: 100%; width: 100%; }
        .cover-page .title, .cover-page .subtitle, .cover-page .author { position: absolute; left: 50%; transform: translateX(-50%); width: 90%; padding: 0 1cm; box-sizing: border-box; }
        .cover-page .title { font-family: 'League Gothic', sans-serif; font-size: 4.5rem; text-transform: uppercase; margin: 0; line-height: 1.1; color: #0d47a1; top: 30mm; }
        .cover-page .subtitle { font-family: 'Merriweather Sans', sans-serif; font-size: 1.125rem; margin: 0; color: #212121; font-style: italic; top: 100mm; }
        .cover-page .author { font-family: 'Merriweather Sans', sans-serif; font-size: 1rem; font-weight: 400; margin: 0; color: #212121; top: 140mm; }
        .onda { position: absolute; top: 155mm; width: 200%; height: 100mm; left: -50%; border-radius: 45%; z-index: 1; }
        .onda1 { background: linear-gradient(90deg, #0052A5 0%, #0ACF83 100%); transform: rotate(-8deg); }
        .onda2 { background: linear-gradient(90deg, #0ACF83 0%, #0052A5 100%); opacity: 0.75; transform: rotate(-5deg); }
        .onda3 { background: linear-gradient(90deg, #0077FF 0%, #00FFB3 100%); opacity: 0.5; transform: rotate(-2deg); }
        .copyright-page { justify-content: flex-end; padding: 2cm; }
        .copyright-page .content { text-align: center; font-family: 'Merriweather Sans', sans-serif; font-size: 8pt; color: #595959; }
        /* The main content-page class is now handled by html2pdf margin */
        .content-body h1 { font-family: 'Merriweather', serif; font-weight: 700; font-size: 24pt; margin-bottom: 1.5em; color: #333; text-align: left; page-break-after: avoid; }
        .content-body h2 { font-family: 'Merriweather', serif; font-weight: 700; font-size: 18pt; margin-top: 1.5em; margin-bottom: 1em; color: #333; page-break-after: avoid; }
        .content-body h3 { font-family: 'Merriweather Sans', sans-serif; font-weight: 700; font-size: 14pt; margin-top: 1.5em; margin-bottom: 0.5em; color: #444; page-break-after: avoid; }
        .content-body p { line-height: 15.02pt; margin: 0 0 15.02pt 0; text-align: justify; }
        .content-body p.indent { text-indent: 1.5em; }
        .toc-item { font-family: 'Merriweather Sans', sans-serif; margin-bottom: 4pt; line-height: 15.02pt; }
        .toc-chapter { font-weight: 700; margin-top: 8pt; }
        .toc-subchapter { margin-left: 20px; }
        .chapter-title-page { display: flex; justify-content: center; align-items: center; text-align: center; }
        .chapter-title-page h1 { font-family: 'Merriweather', serif; font-size: 24pt; }
    </style>
`;

const getPartHtmlContent = (book: Book, part: BookPart): string => {
    let content;
    try {
      content = JSON.parse(part.content);
    } catch (e) {
      console.error(`Failed to parse content for part_id: ${part.id}`, part.content);
      content = { content: part.content }; // Use raw content as a fallback
    }

    switch (part.part_type) {
        case 'cover':
            return `<div class="page-container cover-page"><div class="content-wrapper"><h1 class="title">${content.title}</h1><p class="subtitle">${content.subtitle}</p><p class="author">${content.author}</p></div><div class="onda onda1"></div><div class="onda onda2"></div><div class="onda onda3"></div></div>`;
        case 'copyright':
            const copyrightText = typeof content === 'string' ? content : (content.content || `Copyright © ${new Date().getFullYear()} ${book.author}`);
            return `<div class="page-container copyright-page"><div class="content"><p>${copyrightText}</p><p>Todos os direitos reservados.</p><p>Este livro ou qualquer parte dele não pode ser reproduzido ou usado de forma alguma sem a permissão expressa por escrito do editor, exceto pelo uso de breves citações em uma resenha do livro.</p></div></div>`;
        case 'toc':
             return `<div class="page-container"><div class="content-body"><h1>${content.title}</h1>${content.content.split('\n').map((line: string) => { line = line.trim(); if (!line) return ''; if (line.match(/^capítulo \\d+:/i)) { return `<p class="toc-item toc-chapter">${line}</p>`; } return `<p class="toc-item toc-subchapter">${line}</p>`; }).join('')}</div></div>`;
        case 'introduction':
        case 'conclusion':
             return `<div class="page-container"><div class="content-body"><h1>${content.title}</h1>${formatContentForHTML(content.content, true)}</div></div>`;
        case 'chapter_title':
            return `<div class="page-container chapter-title-page"><h1>${content.title}</h1></div>`;
        case 'chapter_content':
            return `<div class="page-container"><div class="content-body"><h2 class="font-merriweather">${content.title}</h2>${formatContentForHTML(content.introduction, false)}${content.subchapters.map((sub: any) => `<h3 class="font-merriweather-sans">${sub.title}</h3>${formatContentForHTML(sub.content)}`).join('')}</div></div>`;
        default:
            return '';
    }
}

/**
 * Assembles the HTML for a single book part, wrapped in a full HTML document structure.
 * This is used by the sequential PDF generator.
 */
export const assemblePartHtml = (book: Book, part: BookPart): string => {
    const partContent = getPartHtmlContent(book, part);
    return `<html><head><title>${book.title}</title>${getStyles()}</head><body>${partContent}</body></html>`;
};


/**
 * Assembles the full HTML string for a book from its constituent parts.
 * This function is used for the iframe preview.
 */
export const assembleFullHtml = (book: Book, parts: BookPart[]): string => {
  let htmlContent = '';
  // Ensure parts are sorted correctly before assembly
  parts.sort((a, b) => a.part_index - b.part_index).forEach(part => {
      htmlContent += getPartHtmlContent(book, part)
        // Add a visual separator for preview purposes only
        .replace('class="page-container', 'style="page-break-after: always; border-bottom: 2px dashed #ccc;" class="page-container');
  });

  return `<html><head><title>${book.title}</title>${getStyles()}</head><body>${htmlContent}</body></html>`;
};
