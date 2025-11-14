import type { Book, BookPart } from '../types';

/**
 * Converte um texto simples com quebras de linha em parágrafos HTML.
 */
const formatParagraphs = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.split('\n')
    .filter(p => p.trim() !== '')
    .map(p => `<p class="font-merriweather">${p.trim()}</p>`)
    .join('\n');
};

/**
 * Gera o conteúdo completo da tag <head>, incluindo todos os estilos CSS.
 */
const getHeadContent = (book: Book): string => {
  const safeTitle = book.title.toUpperCase().replace(/"/g, "'");

  return `
  <head>
    <meta charset="utf-8">
    <title>${book.title}</title>
    <style>
      /* --- FONTES --- */
      @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Merriweather:wght@300;400;700;800&family=Merriweather+Sans:wght@300;400;700;800&display=swap');

      /* ======================================= */
      /*   SISTEMA DE PÁGINAS MESTRAS            */
      /* ======================================= */

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
      @page content:first { @top-center { content: ""; } }
      @page :first {
         size: A5;
         margin: 0;
         @top-center { content: ""; }
         @bottom-center { content: ""; }
      }

      /* --- ESTILOS GERAIS E CONTAINERS --- */
      body { font-family: 'Merriweather', serif; font-size: 12pt; color: #262626; margin: 0; background-color: #ffffff; }
      .page-container { width: 100%; margin: 0; padding: 0; background: transparent; box-shadow: none; page-break-after: always; }
      .content-page { page: content; }

      /* --- ESTILOS DA CAPA --- */
      .cover-page {
        width: 14.8cm; height: 21cm; position: relative; overflow: hidden;
        background-size: cover; background-position: center;
      }
      .cover-element { position: absolute; width: 90%; left: 50%; transform: translateX(-50%); text-align: center; padding: 0 1cm; box-sizing: border-box; }
      .cover-title { top: 40mm; font-family: 'League Gothic', sans-serif; font-size: 3.5rem; line-height: 1.1; text-transform: uppercase; color: #001f5c; }
      .cover-subtitle { top: 90mm; font-family: 'Merriweather Sans', sans-serif; font-weight: 300; font-size: 1.1rem; line-height: 1.6; color: #2b4b8a; }
      .cover-author { bottom: 45mm; font-family: 'Merriweather Sans', sans-serif; font-weight: 700; font-size: 0.8rem; letter-spacing: 2px; text-transform: uppercase; color: #4a68a5; }
      .cover-logo { bottom: 20mm; width: auto; height: 25px; }

      /* --- HIERARQUIA TIPOGRÁFICA (ALINHADA À GRADE) --- */
      .chapter-title-page { display: flex; justify-content: center; align-items: flex-start; text-align: center; }
      .chapter-title-standalone {
        font-family: 'Merriweather', serif; font-size: 24pt; line-height: 36pt;
        margin-top: 180pt;
      }
      .content-page h2.font-merriweather { 
        font-family: 'Merriweather', serif; font-weight: 700; font-size: 24pt; line-height: 1.5;
        text-align: center; color: rgba(51, 51, 51, 0.5);
        margin-top: 36pt; margin-bottom: 54pt;
      }
      .content-page h3.font-merriweather-sans { 
        font-family: 'Merriweather Sans', sans-serif; font-weight: 800; font-size: 14.4pt; line-height: 1.25;
        color: rgba(36, 36, 36, 0.75);
        margin-top: 36pt; margin-bottom: 18pt;
      }
      .content-page p.font-merriweather { 
        font-size: 12pt; line-height: 1.5; font-weight: 300; text-align: justify;
        hyphens: auto; orphans: 2; widows: 2; text-indent: 1cm;
        margin-top: 0; margin-bottom: 18pt;
      }
      .content-page h2 + p.font-merriweather,
      .content-page h3 + p.font-merriweather {
        text-indent: 0;
      }
    </style>
  </head>`;
};

const getInnerHtmlForPart = (book: Book, part: BookPart): string => {
    let content: any;
    try {
        content = JSON.parse(part.content);
    } catch (e) {
        content = { title: part.title, subtitle: part.subtitle, content: part.content };
    }

    switch (part.part_type) {
        case 'cover':
            const coverData = content;
            const coverBgUrl = 'https://raw.githubusercontent.com/lidiabookmaker/lidia-app/main/public/fundo-light-lidia-cover.webp';
            const logoUrl = 'https://raw.githubusercontent.com/lidiabookmaker/lidia-app/main/public/lidia-logo-trans.svg';

            return `
              <div class="page-container cover-page" style="background-image: url('${coverBgUrl}');">
                  <h1 class="cover-element cover-title">${coverData.title || book.title}</h1>
                  <p class="cover-element cover-subtitle">${coverData.subtitle || ''}</p>
                  <p class="cover-element cover-author">${book.author}</p>
                  <img class="cover-element cover-logo" src="${logoUrl}" alt="Logo Lidia">
              </div>`;

        case 'copyright':
            const copyrightText = content.content || `Copyright © ${new Date().getFullYear()} ${book.author}`;
            return `<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 180mm; text-align: center; font-size: 10pt;"><p>${copyrightText}</p><p>Todos os direitos reservados.</p></div>`;

        case 'toc':
            const tocTitle = content.title || 'Sumário';
            const tocContent = content.content || '';
            return `<h2 class="font-merriweather">${tocTitle}</h2>` + tocContent.split('\n').map((line: string) => `<p class="font-merriweather" style="text-indent: 0; text-align: left;">${line}</p>`).join('');
        
        case 'introduction':
             const introTitle = content.title || 'Introdução';
             return `<h2 class="font-merriweather">${introTitle}</h2>` + formatParagraphs(content.content);
        
        case 'chapter_title':
            return `<div class="page-container chapter-title-page"><h1 class="chapter-title-standalone">${content.title}</h1></div>`;

        case 'chapter_content':
            let chapterHtml = '';
            if (content.introduction) {
              chapterHtml += formatParagraphs(content.introduction);
            }
            if (content.subchapters && Array.isArray(content.subchapters)) {
              content.subchapters.forEach((sub: any) => {
                  chapterHtml += `<h3 class="font-merriweather-sans">${sub.title}</h3>`;
                  chapterHtml += formatParagraphs(sub.content);
              });
            }
            return chapterHtml;
        
        default:
            return '';
    }
};

export const assembleFullHtml = (book: Book, parts: BookPart[]): string => {
  parts.sort((a, b) => a.part_index - b.part_index);
  
  const head = getHeadContent(book);
  
  const bodyContent = parts.map(part => {
    const innerHtml = getInnerHtmlForPart(book, part);
    
    if (part.part_type === 'cover' || part.part_type === 'chapter_title') {
      return innerHtml;
    }
    
    return `<div class="page-container content-page">${innerHtml}</div>`;
  }).join('\\n');

  return `<!DOCTYPE html>
    <html lang="pt-BR">
    ${head}
    <body>
        ${bodyContent}
    </body>
    </html>`;
};