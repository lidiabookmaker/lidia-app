// services/bookFormatter.ts

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
 * VERSÃO FINAL: SUBCAPÍTULOS DO SUMÁRIO COM FONTE LEVE (300)
 */
const getHeadContent = (book: Book): string => {
  const safeTitle = book.title.toUpperCase().replace(/"/g, "'");

  return `<head>
    <meta charset="utf-8">
    <title>${book.title}</title>
    <style>
      /* --- FONTES --- */
      @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Merriweather:wght@400;700&family=Merriweather+Sans:wght@300;400;700;800&display=swap&v=4');

      /* ======================================= */
      /*   SISTEMA DE PÁGINAS MESTRAS            */
      /* ======================================= */

      /* 1. Mestra para a CAPA (Margem ZERO) */
      @page cover_style {
        size: A5;
        margin: 0;
      }

      /* 2. Mestra para PÁGINAS LIMPAS */
      @page blank_page {
        size: A5;
        margin: 25mm 20mm 17mm 20mm;
        @top-center { content: ""; }
        @bottom-center { content: ""; }
      }

      /* 3. Mestra para o CONTEÚDO PADRÃO */
      @page content {
        size: A5;
        margin: 25mm 20mm 17mm 20mm;
        @top-center {
          content: "${safeTitle}";
          font-family: 'Merriweather Sans', sans-serif;
          font-weight: 300; font-size: 8pt; color: #000080;
        }
        @bottom-center {
          content: counter(page);
          font-family: 'Merriweather Sans', sans-serif;
          font-weight: 800; font-size: 14pt; color: rgba(0, 0, 128, 0.4);
        }
      }
      @page content:first {
        @top-center { content: ""; }
      }

      /* --- ESTILOS GERAIS --- */
      body {
        font-family: 'Merriweather', serif;
        font-size: 12pt;
        color: #262626;
        margin: 0;
      }
      .page-container {
        page-break-after: always;
        width: 100%;
        box-sizing: border-box;
      }
      .content-page { page: content; }
      .blank-page { page: blank_page; }
      
      /* --- ESTILOS DA CAPA --- */
      .cover-page {
        page: cover_style; 
        position: relative; 
        overflow: hidden;
        background-size: cover;
        background-position: center;
        width: 148mm; 
        height: 210mm; 
        padding: 0;
        margin: 0;
      }
      .cover-layout {
        display: flex;
        flex-direction: column;    
        justify-content: space-between; 
        align-items: center;      
        width: 100%;
        height: 100%;             
        text-align: center;
        box-sizing: border-box;
        padding: 20mm; 
      }
      .cover-title { font-family: 'League Gothic', sans-serif; font-size: 48pt; line-height: 1; text-transform: uppercase; color: #001f5c; margin: 0; }
      .cover-subtitle { font-family: 'Merriweather Sans', sans-serif; font-weight: 300; font-size: 14.4pt; line-height: 1.25; color: #2b4b8a; margin-top: 15mm; }
      .cover-author { font-family: 'Merriweather Sans', sans-serif; font-weight: 400; font-size: 10pt; text-transform: uppercase; color: #4a68a5; margin: 0; }
      .cover-logo { height: 40px; margin-top: 15mm; }

      /* --- COPYRIGHT --- */
      .copyright-page {
        display: flex;
        flex-direction: column;
        justify-content: flex-end; 
        align-items: center;
        height: 160mm; 
      }
      .copyright-content {
        text-align: center;
        font-family: 'Merriweather Sans', sans-serif;
        font-size: 10pt;
        width: 100%;
      }

      /* --- SUMÁRIO (MUDANÇA AQUI) --- */
      .toc-chapter { 
        font-weight: 700; 
        margin-top: 12pt; 
      }
      
      .toc-subchapter { 
        margin-left: 1cm; 
        font-family: 'Merriweather Sans', sans-serif; /* Fonte Sans */
        font-size: 10pt;                              /* Tamanho menor */
        font-weight: 300;                             /* Peso leve (Light) */
        line-height: 1.4;                             /* Melhor leitura */
      }

      /* --- FOLHAS DE ROSTO DE CAPÍTULO --- */
      .chapter-title-page {
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
        height: 160mm; 
      }
      .chapter-title-standalone { font-size: 24pt; }

      /* --- ESTILOS DO CONTEÚDO --- */
      
      /* TÍTULOS H2 */
      .content-page h2.font-merriweather,
      .blank-page h2.font-merriweather { 
        font-family: 'Merriweather', serif; 
        font-weight: 700; 
        font-size: 24pt; 
        line-height: 1.5; 
        text-align: center; 
        color: rgba(51, 51, 51, 0.5); 
        margin-top: 36pt; 
        margin-bottom: 54pt; 
      }

      .content-page h3.font-merriweather-sans,
      .blank-page h3.font-merriweather-sans { 
        font-family: 'Merriweather Sans', sans-serif; 
        font-weight: 800; 
        font-size: 14.4pt; 
        line-height: 1.25; 
        color: rgba(36, 36, 36, 0.75); 
        margin-top: 36pt; 
        margin-bottom: 18pt; 
      }

      .content-page p.font-merriweather { 
        text-align: justify; hyphens: auto; orphans: 2; widows: 2; page-break-inside: avoid; text-indent: 1cm; margin-top: 0; margin-bottom: 18pt;
      }
      
      .content-page h2 + p.font-merriweather,
      .content-page h3 + p.font-merriweather,
      .blank-page h2 + p.font-merriweather { 
        text-indent: 0; 
      }

    </style>
  </head>`;
};

/**
 * Gera o HTML interno para uma única parte do livro.
 */
const getInnerHtmlForPart = (book: Book, part: BookPart): string => {
  let content: any;
  try {
    content = JSON.parse(part.content);
  } catch (e) {
    content = { title: (book as any).title, content: part.content };
  }

  switch (part.part_type) {
  
    case 'cover': {
      const coverBgUrl = 'https://raw.githubusercontent.com/lidiabookmaker/lidia-app/main/public/fundo-light-lidia-cover.webp';
      const logoUrl = 'https://raw.githubusercontent.com/lidiabookmaker/lidia-app/main/public/lidia-logo-trans.svg';
      const title = content?.title || book?.title || 'Título';
      const subtitle = content?.subtitle || book?.subtitle || 'Subtítulo';
      const author = book?.author || 'Autor';

      return `
        <div class="page-container cover-page" style="background-image: url('${coverBgUrl}');">
          <div class="cover-layout">
            <div> 
              <h1 class="cover-title">${title}</h1>
              <p class="cover-subtitle">${subtitle}</p>
            </div>
            <div> 
              <p class="cover-author">${author}</p>
              <img class="cover-logo" src="${logoUrl}" alt="Logo Lidia">
            </div>
          </div>
        </div>
      `;
    }
            
    case 'copyright': {
      const copyrightText = content.content || `Copyright © ${new Date().getFullYear()} ${book.author}`;
      return `<div class="page-container blank-page copyright-page">
                <div class="copyright-content">
                  <p>${copyrightText}</p>
                  <p>Todos os direitos reservados.</p>
                  <p style="margin-top: 10px;">É proibida a reprodução total ou parcial desta obra, de qualquer forma ou meio, sem a autorização prévia e por escrito do autor.</p>
                  <p style="margin-top: 20px; font-size: 8pt; color: #555;">Este produto digital foi criado pelo autor com o uso da exclusiva tecnologia SNT® Core Inside licenciada na plataforma Lidia WACE.</p>
                </div>
              </div>`;
    }

    case 'toc': {
      const tocTitle = content.title || 'Sumário';
      const tocContent = content.content || '';
      const tocLinesHtml = tocContent.split('\n').map((line: string) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return '';
        return trimmedLine.startsWith('-')
          ? `<p class="toc-subchapter">${trimmedLine.substring(1).trim()}</p>`
          : `<p class="toc-chapter">${trimmedLine}</p>`;
      }).join('');
      return `<div class="page-container blank-page">
                <h2 class="font-merriweather">${tocTitle}</h2>
                ${tocLinesHtml}
              </div>`;
    }

    case 'introduction': {
      const introTitle = content.title || 'Introdução';
      return `<div class="page-container content-page">
                <h2 class="font-merriweather">${introTitle}</h2>
                ${formatParagraphs(content.content)}
              </div>`;
    }

    case 'chapter_title': {
      return `<div class="page-container blank-page chapter-title-page">
                <h1 class="chapter-title-standalone">${content.title}</h1>
              </div>`;
    }

    case 'chapter_content': {
      let chapterHtml = '';
      if (content.title) {
        chapterHtml += `<h2 class="font-merriweather">${content.title}</h2>`;
      }
      if (content.introduction) {
        chapterHtml += formatParagraphs(content.introduction);
      }
      if (content.subchapters && Array.isArray(content.subchapters)) {
        content.subchapters.forEach((sub: any) => {
          chapterHtml += `<h3 class="font-merriweather-sans">${sub.title}</h3>`;
          chapterHtml += formatParagraphs(sub.content);
        });
      }
      return `<div class="page-container content-page">${chapterHtml}</div>`;
    }
            
    default:
      return '';
  }
};

export const assembleFullHtml = (book: Book, parts: BookPart[]): string => {
  parts.sort((a, b) => a.part_index - b.part_index);
  const head = getHeadContent(book);
  const bodyContent = parts.map(part => getInnerHtmlForPart(book, part)).join('\n');
  return `<!DOCTYPE html><html lang="pt-BR">${head}<body>${bodyContent}</body></html>`;
};