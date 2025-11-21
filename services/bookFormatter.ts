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
 * VERSÃO FINAL E CONSOLIDADA
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

      /* 1. Mestra para a CAPA (sempre a primeira página) */
      @page :first {
        size: A5;
        margin: 0;
      }

      /* 2. Mestra para PÁGINAS LIMPAS (Copyright, Sumário, Folhas de Rosto) */
      @page blank_page {
        size: A5;
        margin: 25mm 20mm 17mm 20mm; /* Margens para o conteúdo interno */
        @top-center { content: ""; }
        @bottom-center { content: ""; }
      }

      /* 3. Mestra para o CONTEÚDO PADRÃO (com cabeçalho/rodapé) */
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

      /* --- ESTILOS GERAIS E CONECTORES --- */
      body {
        font-family: 'Merriweather', serif;
        font-size: 12pt;
        color: #262626;
        margin: 0;
      }
      .page-container {
        page-break-after: always;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
      .content-page { page: content; }
      .blank-page { page: blank_page; }
      
      /* --- ESTILOS DA CAPA --- */
      .cover-page {
        position: relative; 
        overflow: hidden;
        background-size: cover;
        background-position: center;
        background-color: lightblue;
      }
      .cover-layout {
        display: flex;
        flex-direction: column;    /* Empilha os itens verticalmente */
        justify-content: space-between; /* Empurra um grupo para o topo e outro para o fundo */
        align-items: center;      /* Centraliza horizontalmente */
        height: 100%;             /* Ocupa a página inteira */
        text-align: center;       /* Garante que o texto dentro dos filhos esteja centrado */
      }


      /* .cover-element {
        position: absolute;
        width: 82%;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
      } */
      .cover-title { font-family: 'League Gothic', sans-serif; font-size: 48pt; line-height: 1; text-transform: uppercase; color: #001f5c; }
      .cover-subtitle { font-family: 'Merriweather Sans', sans-serif; font-weight: 300; font-size: 14.4pt; line-height: 1.25; color: #2b4b8a; }
      .cover-author { font-family: 'Merriweather Sans', sans-serif; font-weight: 400; font-size: 10pt; text-transform: uppercase; color: #4a68a5; }
      .cover-logo { height: 40px; }

      /* --- ESTILOS DA PÁGINA DE COPYRIGHT --- */
      .copyright-page {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }
      .copyright-content {
        text-align: center;
        font-family: 'Merriweather Sans', sans-serif;
        font-size: 10pt;
        padding-bottom: 5mm;
      }

      /* --- ESTILOS DO SUMÁRIO --- */
      .toc-chapter { font-weight: 700; margin-top: 12pt; }
      .toc-subchapter { margin-left: 1cm; }

      /* --- ESTILOS DAS FOLHAS DE ROSTO DOS CAPÍTULOS --- */
      .chapter-title-page {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .chapter-title-standalone { font-size: 24pt; }

      /* --- ESTILOS DO CONTEÚDO (Títulos e Parágrafos) --- */
      .content-page h2.font-merriweather { font-family: 'Merriweather', serif; font-weight: 700; font-size: 24pt; line-height: 1.5; text-align: center; color: rgba(51, 51, 51, 0.5); margin-top: 36pt; margin-bottom: 54pt; }
      .content-page h3.font-merriweather-sans { font-family: 'Merriweather Sans', sans-serif; font-weight: 800; font-size: 14.4pt; line-height: 1.25; color: rgba(36, 36, 36, 0.75); margin-top: 36pt; margin-bottom: 18pt; }
      .content-page p.font-merriweather { 
        text-align: justify;
        hyphens: auto;
        orphans: 2; 
        widows: 2;
        page-break-inside: avoid;
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
  const coverBgUrl = '...'; // sua url
  const logoUrl = '...';    // sua url
  const title = content?.title || book?.title || 'Título';
  const subtitle = content?.subtitle || book?.subtitle || 'Subtítulo';
  const author = book?.author || 'Autor';

  return `
    <div 
      class="page-container blank-page" 
      style="
        background-image: url('${coverBgUrl}'); 
        background-size: cover; 
        background-position: center;
        display: flex;
        flex-direction: column;
        justify-content: space-between; /* Empurra os grupos para o topo e para o fundo */
        align-items: center;
        text-align: center;
        padding: 6mm 0mm 3mm 0mm; /* CIMA | LATERAIS | BAIXO | LATERAIS */
      "
    >
      
      <div> <!-- Grupo do Topo: Centralizado no espaço superior -->
        <h1 class="cover-title">${title}</h1>
        <p class="cover-subtitle" style="margin-top: 15mm;">${subtitle}</p>
      </div>

      <div> <!-- Grupo de Baixo: Centralizado no espaço inferior -->
        <p class="cover-author">${author}</p>
        <img class="cover-logo" src="${logoUrl}" alt="Logo Lidia" style="margin-top: 15mm;">
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


/**
 * Monta o HTML completo do livro, juntando todas as partes.
 */
export const assembleFullHtml = (book: Book, parts: BookPart[]): string => {
  parts.sort((a, b) => a.part_index - b.part_index);
  
  const head = getHeadContent(book);
  const bodyContent = parts.map(part => getInnerHtmlForPart(book, part)).join('\n');

  return `<!DOCTYPE html>
    <html lang="pt-BR">
      ${head}
      <body>
        ${bodyContent}
      </body>
    </html>`;
};