import type { Book, BookPart } from '../types';

/* ============================================================
   bookFormatter.ts – Revisão A5 v3
   Correções: Capa (PV 30mm), Créditos (PV 140mm),
   Conteúdo fluido visível (altura dinâmica)
   ============================================================ */

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

const balanceText = (text: string, maxLines: number): string => {
  if (!text || typeof text !== 'string') return '';
  const words = text.split(' ').filter(w => w.length > 0);
  if (words.length === 0) return text;
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + word).length > 15 && lines.length < 2) {
      lines.push(line.trim());
      line = '';
    }
    line += word + ' ';
  }
  if (line) lines.push(line.trim());
  return lines.join('<br>');
};

/* ============================================================
   ESTILOS GERAIS
   ============================================================ */

const getStyles = () => `
<style>
  @page { size: A5; margin: 0; }

  @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Merriweather:wght@300;400;700;900&family=Merriweather+Sans:wght@300;400;600;700;800&display=swap');

  body {
    font-family: 'Merriweather', serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #262626;
    margin: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page-container {
    width: 14.8cm;
    min-height: 21cm;
    position: relative;
    background: white;
    page-break-inside: avoid;
  }

  .page-fixed, .page-fluid {
    position: absolute;
    top: 2.4cm;
    left: 2cm;
    width: 10.8cm;
    box-sizing: border-box;
  }

  .page-fixed { height: 15.9cm; }

  .page-fluid {
    min-height: 15.9cm;
    height: auto;
    display: block;
  }

  /* Cabeçalho */
  .page-header {
    font-family: 'Merriweather Sans', sans-serif;
    font-size: 8pt;
    color: #0d47a1;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 0.05em;
    margin-bottom: 0.2cm;
  }

  /* Texto principal */
  .page-text {
    text-align: justify;
    padding-bottom: 2cm;
  }

  .page-text p {
    margin-bottom: 0.4em;
    text-indent: 1.5em;
  }

  /* Rodapé */
  .page-footer {
    font-family: 'Merriweather Sans', sans-serif;
    font-weight: 800;
    font-size: 14pt;
    color: rgba(13, 71, 161, 0.4);
    text-align: center;
    position: absolute;
    bottom: 1.2cm;
    left: 0;
    width: 100%;
  }

  /* Capa */
  .cover-page {
    text-align: center;
    position: relative;
    background: linear-gradient(to bottom right, rgba(255,245,225,0.1), rgba(10,207,131,0.1));
    height: 21cm;
  }

  .cover-page .title {
    font-family: 'League Gothic', sans-serif;
    font-size: 4.5rem;
    text-transform: uppercase;
    color: #0d47a1;
    position: absolute;
    top: 30mm !important;
    left: 50%;
    transform: translateX(-50%);
    width: 10.8cm;
    line-height: 1.1;
    margin: 0;
  }

  .cover-page .subtitle {
    font-family: 'Merriweather Sans', sans-serif;
    font-size: 1.125rem;
    color: #212121;
    position: absolute;
    top: 100mm;
    left: 50%;
    transform: translateX(-50%);
    width: 10.8cm;
  }

  .cover-page .author {
    font-family: 'Merriweather Sans', sans-serif;
    font-size: 1rem;
    color: #212121;
    position: absolute;
    top: 190mm;
    left: 50%;
    transform: translateX(-50%);
    width: 10.8cm;
  }

  /* Ondas (desativadas) */
  /* .onda { ... } */

  /* Créditos */
  .copyright-page {
    position: absolute;
    top: 2.4cm;
    left: 2cm;
    width: 10.8cm;
    height: 15.9cm;
  }

  .copyright-page .content {
    position: absolute;
    top: 116mm;
    left: 0;
    width: 10.8cm;
    text-align: center;
    font-family: 'Merriweather Sans', sans-serif;
    font-size: 9pt;
    color: #595959;
    line-height: 1.5;
  }

  h1, h2, h3 {
    font-family: 'Merriweather Sans', sans-serif;
    color: #0d47a1;
  }
</style>
`;

/* ============================================================
   CONSTRUÇÃO DAS PARTES
   ============================================================ */

export const getPartHtmlContent = (book: Book, part: BookPart): string => {
  let content;
  try {
    content = JSON.parse(part.content);
  } catch {
    content = { content: part.content };
  }

  switch (part.part_type) {
    case 'cover':
      return `<div class="page-container cover-page">
        <h1 class="title">${balanceText(content.title, 3)}</h1>
        <p class="subtitle">${balanceText(content.subtitle, 3)}</p>
        <p class="author">${content.author}</p>
      </div>`;

    case 'copyright':
      const copyrightText =
        typeof content === 'string'
          ? content
          : content.content || `Copyright © ${new Date().getFullYear()} ${book.author}`;
      return `<div class="page-container">
        <div class="copyright-page">
          <div class="content">
            <p>${copyrightText}</p>
            <p>Todos os direitos reservados.</p>
            <p>Este livro ou qualquer parte dele não pode ser reproduzido ou usado sem autorização expressa, exceto por breves citações em resenhas.</p>
          </div>
        </div>
      </div>`;

    case 'toc':
      return `<div class="page-container page-fixed">
        <div class="page-text">
          <h1>${content.title}</h1>
          ${content.content.split('\n').map((line: string) => {
            line = line.trim();
            if (!line) return '';
            if (line.match(/^capítulo \\d+:/i)) {
              return `<p class="toc-item toc-chapter">${line}</p>`;
            }
            return `<p class="toc-item toc-subchapter">${line}</p>`;
          }).join('')}
        </div>
      </div>`;

    case 'introduction':
    case 'conclusion':
    case 'chapter_content':
      return `<div class="page-container page-fluid">
        <div class="page-header">${book.title.toUpperCase()}</div>
        <div class="page-text">
          <h2>${content.title}</h2>
          ${formatContentForHTML(content.content || content.introduction || '', false)}
          ${content.subchapters
            ? content.subchapters.map((sub: any) =>
                `<h3>${sub.title}</h3>${formatContentForHTML(sub.content)}`
              ).join('')
            : ''}
        </div>
        <div class="page-footer">${part.part_index}</div>
      </div>`;

    case 'chapter_title':
      return `<div class="page-container page-fixed" style="display: flex; justify-content: center; align-items: center;">
        <h1>${balanceText(content.title, 3)}</h1>
      </div>`;

    default:
      return '';
  }
};

/* ============================================================
   MONTAGEM FINAL
   ============================================================ */

export const assemblePartHtml = (book: Book, part: BookPart): string => {
  const partContent = getPartHtmlContent(book, part);
  return `<html><head><title>${book.title}</title>${getStyles()}</head><body>${partContent}</body></html>`;
};

export const assembleFullHtml = (book: Book, parts: BookPart[]): string => {
  let htmlContent = '';
  parts.sort((a, b) => a.part_index - b.part_index).forEach(part => {
    const partHtml = getPartHtmlContent(book, part);
    if (partHtml.trim()) {
      htmlContent += partHtml + '<div style="page-break-after: always;"></div>';
    }
  });
  return `<html><head><title>${book.title}</title>${getStyles()}</head><body>${htmlContent}</body></html>`;
};
