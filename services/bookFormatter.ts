import type { Book, BookPart } from '../types';

const formatParagraphs = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.split('\n')
    .filter(p => p.trim() !== '')
    .map(p => `<p class="font-merriweather">${p.trim()}</p>`)
    .join('\n');
};

const getHeadContent = (book: Book): string => {
  const safeTitle = book.title.toUpperCase().replace(/"/g, "'");
  return `
  <head>
    <meta charset="utf-8">
    <title>${book.title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Merriweather:wght@200;300;400;700;800&family=Merriweather+Sans:wght@300;400;600;700;800&display=swap');
      @page content {
        size: A5;
        margin: 25mm 20mm 17mm 20mm;
        @top-center {
          content: "${safeTitle}";
          font-family: 'Merriweather Sans', sans-serif;
          font-weight: 300; font-size: 8pt; color: #000080;
          text-transform: uppercase; vertical-align: middle;
        }
        @bottom-center {
          content: counter(page);
          font-family: 'Merriweather Sans', sans-serif;
          font-weight: 800; font-size: 14pt; color: rgba(0, 0, 128, 0.4);
          vertical-align: middle;
        }
      }
      @page content:first {
        @top-center { content: ""; }
      }
      @page :first {
        size: A5;
        margin: 25mm 20mm 17mm 20mm;
        @top-center { content: ""; }
        @bottom-center { content: ""; }
      }
      body {
        font-family: 'Merriweather', serif;
        font-size: 12pt;
        color: #262626;
        margin: 0;
        background-color: #ffffff;
      }
      .page-container {
        width: 100%;
        margin: 0; padding: 0;
        background: transparent;
        box-shadow: none;
        page-break-after: always;
      }
      .content-page {
        page: content;
      }
      .chapter-title-page { 
        display: flex; 
        justify-content: center;
        align-items: flex-start;
        text-align: center;
        height: 210mm;
        box-sizing: border-box;
      }
      .chapter-title-standalone {
        font-family: 'Merriweather', serif;
        font-size: 24pt;
        line-height: 36pt;
        margin-top: 180pt;
      }
      .content-page h2.font-merriweather { 
        font-family: 'Merriweather', serif;
        font-weight: 700;
        font-size: 24pt;
        line-height: 1.5;
        text-align: center;
        color: rgba(51, 51, 51, 0.5);
        margin-top: 36pt;
        margin-bottom: 54pt;
        page-break-before: always;
        page-break-after: avoid;
      }
      .content-page > *:first-child,
      .content-page > h2:first-of-type {
          page-break-before: auto !important;
      }
      .content-page h3.font-merriweather-sans { 
        font-family: 'Merriweather Sans', sans-serif;
        font-weight: 800;
        font-size: 14.4pt;
        line-height: 1.25;
        color: rgba(36, 36, 36, 0.75);
        margin-top: 36pt;
        margin-bottom: 18pt;
        page-break-after: avoid;
      }
      .content-page p.font-merriweather { 
        font-size: 12pt;
        line-height: 1.5;
        font-weight: 300;
        text-align: justify;
        hyphens: auto;
        orphans: 2;
        widows: 2;
        text-indent: 1cm;
        margin-top: 0;
        margin-bottom: 18pt;
      }
      .content-page h2 + p.font-merriweather,
      .content-page h3 + p.font-merriweather {
        text-indent: 0;
      }
    </style>
  </head>`;
};

const getInnerHtmlForPart = (book: Book, part: BookPart): string => {
    let content;
    try {
        content = JSON.parse(part.content);
    } catch (e) {
        content = { content: part.content };
    }
    switch (part.part_type) {
        case 'cover':
            return `<div class="page-container chapter-title-page"><h1 class="chapter-title-standalone">${content.title}</h1></div>`;
        case 'copyright':
            const copyrightText = content.content || `Copyright © ${new Date().getFullYear()} ${book.author}`;
            return `<div style="page-break-after: always;"><div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 180mm; text-align: center; font-size: 10pt;"><p class="font-merriweather">${copyrightText}</p><p class="font-merriweather">Todos os direitos reservados.</p></div></div>`;
        case 'toc':
            return `<h2 class="font-merriweather">${content.title}</h2>` + content.content.split('\n').map((line: string) => `<p class="font-merriweather" style="text-indent: 0; text-align: left;">${line}</p>`).join('');
        case 'introduction':
        case 'conclusion':
            return `<h2 class="font-merriweather">${content.title}</h2>` + formatParagraphs(content.content);
        case 'chapter_title':
            return `<h2 class="font-merriweather">${content.title}</h2>`;
        case 'chapter_content':
            let chapterHtml = formatParagraphs(content.introduction);
            content.subchapters.forEach((sub: any) => {
                chapterHtml += `<h3 class="font-merriweather-sans">${sub.title}</h3>`;
                chapterHtml += formatParagraphs(sub.content);
            });
            return chapterHtml;
        default:
            return '';
    }
};

export const assemblePartHtml = (book: Book, part: BookPart): string => {
  const partContent = getInnerHtmlForPart(book, part);
  const head = getHeadContent(book);
  const body = part.part_type === 'cover' ? partContent : `<div class="page-container content-page">${partContent}</div>`;
  return `<!DOCTYPE html><html lang="pt-BR">${head}<body>${body}</body></html>`;
};

export const assembleFullHtml = (book: Book, parts: BookPart[]): string => {
  parts.sort((a, b) => a.part_index - b.part_index);
  let coverHtml = '';
  let mainContentHtml = '';

  parts.forEach(part => {
    if (part.part_type === 'cover') {
      coverHtml = getInnerHtmlForPart(book, part);
    } else {
      mainContentHtml += getInnerHtmlForPart(book, part);
    }
  });

  const head = getHeadContent(book);
  return `<!DOCTYPE html>
    <html lang="pt-BR">
    ${head}
    <body>
        ${coverHtml}
        <div class="page-container content-page">
            ${mainContentHtml}
        </div>
    </body>
    </html>`;
};
