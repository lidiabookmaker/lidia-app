import type { Book, BookPart } from '../types';

/* ============================================================
   NOVO bookFormatter.ts – Versão A5 com Cabeçalho e Rodapé
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
   ESTILOS GERAIS DO LIVRO
   ============================================================ */

const getStyles = () => `
<style>
  @page { size: A5; margin: 0; }

  body {
    font-family: 'Merriweather', serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #262626;
    margin: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Página base */
  .page-container {
    width: 14.8cm;
    height: 21cm;
    position: relative;
    background: white;
    page-break-inside: avoid;
  }

  /* Página fixa */
  .page-fixed {
    position: absolute;
    top: 2.4cm;
    left: 2cm;
    width: 10.8cm;
    height: 15.9cm;
  }

  /* Página fluida */
  .page-fluid {
    position: absolute;
    top: 2.4cm;
    left: 2cm;
    width: 10.8cm;
    height: 15.9cm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* Cabeçalho */
  .page-header {
    font-family: 'Merriweather Sans', sans-serif;
    font-size: 8pt;
    color: #0d47a1;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 0.05em;
    margin-bottom: 0.3cm;
  }

  /* Corpo do texto */
  .page-text {
    flex-grow: 1;
    text-align: justify;
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
    line-height: 1;
  }

  /* Capa */
  .cover-page {
    text-align: center;
    position: relative;
    background: linear-gradient(to bottom right, rgba(255, 245, 225, 0.1), rgba(10, 207, 131, 0.1));
    height: 21cm;
    overflow: hidden;
  }

  .cover-page .title {
    font-family: 'League Gothic', sans-serif;
    font-size: 4.5rem;
    text-transform: uppercase;
    margin: 0;
    line-height: 1.1;
    color: #0d47a1;
    position: absolute;
    top: 30mm;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
  }

  .cover-page .subtitle {
    font-family: 'Merriweather Sans', sans-serif;
    font-size: 1.125rem;
    color: #212121;
    position: absolute;
    top: 100mm;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
  }

  .cover-page .author {
    font-family: 'Merriweather Sans', sans-serif;
    font-size: 1rem;
    color: #212121;
    position: absolute;
    top: 140mm;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
  }

  /* Ondas da capa (comentadas) */
  /*
  .onda { position: absolute; top: 135mm; width: 200%; height: 90mm; left: -50%; border-radius: 45%; z-index: 1; }
  .onda1 { background: linear-gradient(90deg, #0052A5 0%, #0ACF83 100%); transform: rotate(-8deg); }
  .onda2 { background: linear-gradient(90deg, #0ACF83 0%, #0052A5 100%); opacity: 0.75; transform: rotate(-5deg); }
  .onda3 { background: linear-gradient(90deg, #0077FF 0%, #00FFB3 100%); opacity: 0.5; transform: rotate(-2deg); }
  */

  /* Página de créditos */
  .copyright-page {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 21cm;
    text-align: center;
  }

  .copyright-page .content {
    font-family: 'Merriweather Sans', sans-serif;
    font-size: 9pt;
    color: #595959;
    line-height: 1.5;
    max-width: 10cm;
    margin: 0 auto;
  }
</style>
`;

/* ============================================================
   CONSTRUÇÃO DAS PARTES DO LIVRO
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
        <!-- Ondas comentadas para teste -->
        <!--
        <div class="onda onda1"></div>
        <div class="onda onda2"></div>
        <div class="onda onda3"></div>
        -->
      </div>`;

    case 'copyright':
      const copyrightText =
        typeof content === 'string'
          ? content
          : content.content || `Copyright © ${new Date().getFullYear()} ${book.author}`;
      return `<div class="page-container copyright-page">
        <div class="content">
          <p>${copyrightText}</p>
          <p>Todos os direitos reservados.</p>
          <p>Este livro ou qualquer parte dele não pode ser reproduzido ou usado de forma alguma sem permissão expressa por escrito do editor, exceto pelo uso de breves citações em resenhas.</p>
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
          <h2 class="font-merriweather">${content.title}</h2>
          ${formatContentForHTML(content.content || content.introduction || '', false)}
          ${content.subchapters
            ? content.subchapters.map((sub: any) =>
                `<h3 class="font-merriweather-sans">${sub.title}</h3>${formatContentForHTML(sub.content)}`
              ).join('')
            : ''}
        </div>
        <div class="page-footer">${part.part_index}</div>
      </div>`;

    case 'chapter_title':
      return `<div class="page-container page-fixed">
        <div class="page-fixed" style="display: flex; justify-content: center; align-items: center;">
          <h1>${balanceText(content.title, 3)}</h1>
        </div>
      </div>`;

    default:
      return '';
  }
};

/* ============================================================
   MONTAGEM FINAL DO LIVRO
   ============================================================ */

export const assemblePartHtml = (book: Book, part: BookPart): string => {
  const partContent = getPartHtmlContent(book, part);
  return `<html><head><title>${book.title}</title>${getStyles()}</head><body>${partContent}</body></html>`;
};

export const assembleFullHtml = (book: Book, parts: BookPart[]): string => {
  let htmlContent = '';
  parts.sort((a, b) => a.part_index - b.part_index).forEach(part => {
    htmlContent += getPartHtmlContent(book, part)
      .replace('class="page-container', 'style="page-break-after: always;" class="page-container');
  });
  return `<html><head><title>${book.title}</title>${getStyles()}</head><body>${htmlContent}</body></html>`;
};
