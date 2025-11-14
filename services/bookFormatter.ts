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
  // Prepara o título para ser usado no CSS, removendo caracteres que podem quebrar a string.
  const safeTitle = book.title.toUpperCase().replace(/"/g, "'");

  return `
  <head>
    <meta charset="utf-8">
    <title>${book.title}</title>
    <style>
      /* --- FONTES --- */
      @import url('https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@400;700&family=Merriweather:wght@200;300;400;700;800&family=Merriweather+Sans:wght@300;400;600;700;800&display=swap');

      /* ======================================= */
      /*   SISTEMA DE PÁGINAS MESTRAS            */
      /* ======================================= */

      /* 1. Página mestre para o CONTEÚDO PADRÃO (com cabeçalho/rodapé) */
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

      /* 2. EXCEÇÃO para a PRIMEIRA PÁGINA DE UM FLUXO de conteúdo (remove o cabeçalho) */
      @page content:first {
        @top-center { content: ""; }
      }
      
      /* 3. Regra para a PRIMEIRA PÁGINA DO ARQUIVO (A CAPA), totalmente limpa */
      @page :first {
         size: A5;
         margin: 0; /* A capa não tem margens */
         @top-center { content: ""; }
         @bottom-center { content: ""; }
      }

      /* --- ESTILOS GERAIS E CONTAINERS --- */
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

      /* --- ESTILOS DA CAPA --- */
      .cover-page {
        width: 14.8cm;
        height: 21cm;
        position: relative; 
        overflow: hidden;
        background-size: cover;
        background-position: center;
      }
      .cover-element {
        position: absolute;
        width: 90%;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        padding: 0 1cm;
        box-sizing: border-box;
      }
      .cover-title {
        top: 40mm;
        font-family: 'Anton', sans-serif;
        font-size: 2.8rem;
        line-height: 1.1;
        text-transform: uppercase;
        color: #001f5c;
      }
      .cover-subtitle {
        top: 90mm;
        font-family: 'Montserrat', sans-serif;
        font-size: 1.1rem;
        line-height: 1.6;
        color: #2b4b8a;
      }
      .cover-author {
        bottom: 45mm; 
        font-family: 'Montserrat', sans-serif;
        font-weight: 700;
        font-size: 0.8rem;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #4a68a5;
      }
      .cover-logo {
        bottom: 20mm;
        width: auto;
        height: 25px;
      }

      /* --- HIERARQUIA TIPOGRÁFICA (ALINHADA À GRADE DE 18pt) --- */
      .chapter-title-page { 
        display: flex;
        justify-content: center;
        align-items: flex-start;
        text-align: center;
      }
      .chapter-title-standalone {
        font-family: 'Merriweather', serif;
        font-size: 24pt;
        line-height: 36pt; /* 2 linhas da grade */
        margin-top: 180pt; /* 10 linhas da grade */
      }
      .content-page h2.font-merriweather { 
        font-family: 'Merriweather', serif;
        font-weight: 700;
        font-size: 24pt;
        line-height: 1.5; /* 36pt = 2 linhas da grade */
        text-align: center;
        color: rgba(51, 51, 51, 0.5);
        margin-top: 36pt; /* 2 linhas de espaço acima */
        margin-bottom: 54pt; /* 3 linhas de espaço abaixo */
      }
      .content-page h3.font-merriweather-sans { 
        font-family: 'Merriweather Sans', sans-serif;
        font-weight: 800;
        font-size: 14.4pt;
        line-height: 1.25; /* 18pt = 1 linha da grade */
        color: rgba(36, 36, 36, 0.75);
        margin-top: 36pt; /* 2 linhas de espaço acima */
        margin-bottom: 18pt; /* 1 linha de espaço abaixo */
      }
      .content-page p.font-merriweather { 
        font-size: 12pt;
        line-height: 1.5; /* Ritmo da grade = 18pt */
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

/**
 * Gera o HTML interno para uma única parte do livro (capa, capítulo, etc.).
 */
const getInnerHtmlForPart = (book: Book, part: BookPart): string => {
    let content: any;
    try {
        content = JSON.parse(part.content);
    } catch (e) {
        // Fallback se o conteúdo não for um JSON válido
        content = { title: (book as any).title, content: part.content };
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
            // Cria uma página de rosto dedicada para o título do capítulo
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

/**
 * Monta o HTML para uma única parte, usado na geração de PDF incremental.
 * Esta função foi removida na nova versão, mas mantida aqui para referência se necessário.
 */
export const assemblePartHtml = (book: Book, part: BookPart): string => {
  const innerHtml = getInnerHtmlForPart(book, part);
  const head = getHeadContent(book);
  
  // A capa e as páginas de título já têm seu próprio container.
  if (part.part_type === 'cover' || part.part_type === 'chapter_title') {
    return `<!DOCTYPE html><html lang="pt-BR">${head}<body>${innerHtml}</body></html>`;
  }
  
  // Outras partes são envolvidas no container de conteúdo.
  const body = `<div class="page-container content-page">${innerHtml}</div>`;
  return `<!DOCTYPE html><html lang="pt-BR">${head}<body>${body}</body></html>`;
};


/**
 * Monta o HTML completo do livro, juntando todas as partes.
 */
export const assembleFullHtml = (book: Book, parts: BookPart[]): string => {
  // Garante que as partes estão na ordem correta
  parts.sort((a, b) => a.part_index - b.part_index);
  
  const head = getHeadContent(book);
  
  // Mapeia cada parte para seu próprio container, garantindo quebras de página corretas
  const bodyContent = parts.map(part => {
    const innerHtml = getInnerHtmlForPart(book, part);
    
    // A capa e as páginas de título de capítulo já retornam seu próprio container principal.
    if (part.part_type === 'cover' || part.part_type === 'chapter_title') {
      return innerHtml;
    }
    
    // As outras partes são envolvidas em um container para controle de página e aplicação de estilos.
    return `<div class="page-container content-page">${innerHtml}</div>`;
  }).join('\n');

  // Monta o documento final, incluindo o lang="pt-BR" essencial para a hifenização.
  return `<!DOCTYPE html>
    <html lang="pt-BR">
    ${head}
    <body>
        ${bodyContent}
    </body>
    </html>`;
};
