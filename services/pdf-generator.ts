import jsPDF from 'jspdf';
import { 
    coverBackgroundImage
} from './pdf-assets';

// As importações de fontes foram removidas pois os arquivos de fonte não estavam disponíveis, causando erros.
// A lógica foi adaptada para usar fontes padrão do PDF.

// --- Constantes de Layout ---
const PAGE_FORMAT = 'a5';
const MARGIN_CM = 2;
const FONT_SIZE_BODY = 11;
const FONT_SIZE_H1 = 24;
const FONT_SIZE_H2 = 18;
const FONT_SIZE_H3 = 14;
const LINE_HEIGHT_RATIO_BODY = 1.6;
const LINE_HEIGHT_RATIO_TITLE = 1.2;

// A função addCustomFonts foi removida pois não será mais utilizada.

/**
 * Generates and downloads a PDF from an HTML string using a programmatic, text-based approach.
 * This results in a high-quality, lightweight, and text-selectable PDF.
 * @param bookTitle The title of the book, used for the PDF header and filename.
 * @param htmlContent The full HTML content of the book.
 */
export const downloadAsPdf = (bookTitle: string, htmlContent: string) => {
    if (!htmlContent) {
        console.error("No HTML content provided to generate PDF.");
        return;
    }

    const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: PAGE_FORMAT,
    });
    
    // A chamada para addCustomFonts foi removida.

    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(htmlContent, 'text/html');
    const contentBody = htmlDoc.body;

    const pageDimensions = {
        width: doc.internal.pageSize.getWidth(),
        height: doc.internal.pageSize.getHeight(),
    };
    const marginPt = MARGIN_CM * 28.3465; // Convert cm to points
    const usableWidth = pageDimensions.width - (marginPt * 2);

    let currentY = marginPt;
    const resetY = () => { currentY = marginPt; };
    
    const checkAndAddPage = (requiredHeight: number) => {
        if (currentY + requiredHeight > pageDimensions.height - marginPt) {
            doc.addPage();
            resetY();
            return true;
        }
        return false;
    };
    
    const addWrappedText = (text: string, options: {
        font: 'Merriweather' | 'MerriweatherSans' | 'LeagueGothic';
        fontSize: number;
        weight?: 'normal' | 'bold' | 'light' | 'italic';
        indent?: number;
        align?: 'left' | 'center' | 'justify';
        color?: string;
        lineHeightRatio?: number;
        isTitle?: boolean;
        x?: number;
        y?: number;
        maxWidth?: number;
    }) => {
        const { 
            font, 
            fontSize, 
            weight = 'normal', 
            indent = 0, 
            align = 'left', 
            color = '#000000', 
            lineHeightRatio = LINE_HEIGHT_RATIO_BODY, 
            isTitle = false,
            x = marginPt,
            y = currentY,
            maxWidth = usableWidth 
        } = options;
        
        // Mapeia as fontes desejadas para as fontes padrão do PDF
        const fontMap: { [key: string]: string } = {
            'Merriweather': 'times',
            'MerriweatherSans': 'helvetica',
            'LeagueGothic': 'helvetica',
        };
        const mappedFont = fontMap[font] || 'helvetica';

        // Mapeia 'light' para 'normal' pois não é um estilo padrão
        const mappedWeight = weight === 'light' ? 'normal' : weight;

        doc.setFont(mappedFont, mappedWeight);
        doc.setFontSize(fontSize);
        doc.setTextColor(color);

        const lines = doc.splitTextToSize(text, maxWidth - indent);
        const lineHeight = fontSize * lineHeightRatio;
        const textHeight = lines.length * lineHeight;
        
        let effectiveY = y;
        if (y === currentY) { // Auto-paginação apenas se estivermos no fluxo principal
            if(checkAndAddPage(textHeight)) {
              effectiveY = currentY; 
            }
            if (isTitle && (effectiveY + textHeight > pageDimensions.height - marginPt - (lineHeight * 2))) {
                doc.addPage();
                resetY();
                effectiveY = currentY;
            }
        }
        
        doc.text(lines, x + indent, effectiveY, { align: align, lineHeightFactor: lineHeightRatio, maxWidth: maxWidth - indent });
        if (y === currentY) {
            currentY = effectiveY + textHeight;
        }
        return textHeight; // Retorna a altura para cálculos manuais de layout
    };
    
    const addSpace = (spacePt: number) => { currentY += spacePt; };

    // --- Page 1: Cover ---
    const coverPageEl = contentBody.querySelector('[data-page="cover"]');
    if (coverPageEl) {
        doc.addImage(coverBackgroundImage, 'PNG', 0, 0, pageDimensions.width, pageDimensions.height, undefined, 'FAST');
        const title = coverPageEl.querySelector('.title')?.textContent || '';
        const subtitle = coverPageEl.querySelector('.subtitle')?.textContent || '';
        const author = coverPageEl.querySelector('.author')?.textContent || '';

        let coverY = pageDimensions.height * 0.25;

        // Title - Tamanho da fonte reduzido para melhor ajuste com Helvetica
        const titleHeight = addWrappedText(title.toUpperCase(), {
            font: 'LeagueGothic',
            fontSize: 54, // AJUSTADO de 72 para 54
            weight: 'bold', // Usando bold para dar mais peso
            color: '#0d47a1',
            align: 'center',
            x: pageDimensions.width / 2,
            y: coverY,
            maxWidth: usableWidth,
            lineHeightRatio: 1.1
        });
        coverY += titleHeight + 50; // Aumentado o espaço

        // Subtitle
        const subtitleHeight = addWrappedText(subtitle, {
            font: 'MerriweatherSans',
            fontSize: 16,
            weight: 'italic',
            color: '#212121',
            align: 'center',
            x: pageDimensions.width / 2,
            y: coverY,
            maxWidth: usableWidth * 0.85, // Reduzido para mais margem
            lineHeightRatio: 1.4
        });
        coverY += subtitleHeight;

        // Author
        addWrappedText(author, {
            font: 'MerriweatherSans',
            fontSize: 14,
            weight: 'normal',
            color: '#212121',
            align: 'center',
            x: pageDimensions.width / 2,
            y: pageDimensions.height * 0.75, // Reposicionado
        });
    }

    // --- Page 2: Copyright ---
    const copyrightPageEl = contentBody.querySelector('[data-page="copyright"]');
    if (copyrightPageEl) {
        doc.addPage();
        const lines = Array.from(copyrightPageEl.querySelectorAll('p')).map(p => p.textContent || '');
        const textBlock = lines.join('\n');

        addWrappedText(textBlock, {
            font: 'MerriweatherSans',
            fontSize: 9,
            weight: 'normal',
            color: '#595959',
            align: 'center',
            x: pageDimensions.width / 2,
            y: pageDimensions.height - marginPt - 30,
        });
    }

    // --- Process Content Pages ---
    const addHeadersAndFooters = () => {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 3; i <= pageCount; i++) {
            doc.setPage(i);

            // Header
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9); // Aumentado para 9
            doc.setTextColor('#595959');
            doc.text(bookTitle.toUpperCase(), pageDimensions.width / 2, marginPt / 2, { align: 'center' });

            // Footer (Page Number)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12); // Reduzido de 18 para 12
            doc.setTextColor('#808080'); // 50% gray
            doc.text(String(i), pageDimensions.width / 2, pageDimensions.height - (marginPt / 2), { align: 'center' });
        }
    };

    const processNode = (node: Element) => {
        const tagName = node.tagName.toLowerCase();
        
        switch(tagName) {
            case 'h1':
                 if (node.classList.contains('font-merriweather')) {
                    checkAndAddPage(FONT_SIZE_H1 * LINE_HEIGHT_RATIO_TITLE * 2);
                    addSpace(10);
                    addWrappedText(node.textContent || '', {
                        font: 'Merriweather',
                        fontSize: FONT_SIZE_H1,
                        weight: 'normal',
                        align: 'left',
                        isTitle: true,
                        lineHeightRatio: LINE_HEIGHT_RATIO_TITLE,
                    });
                    addSpace(20);
                }
                break;
            case 'h2': // Chapter Title
                 addWrappedText(node.textContent || '', {
                    font: 'MerriweatherSans',
                    fontSize: FONT_SIZE_H2,
                    weight: 'bold',
                    isTitle: true,
                    lineHeightRatio: LINE_HEIGHT_RATIO_TITLE,
                });
                addSpace(10);
                break;
            case 'h3': // Subchapter Title
                addSpace(5);
                addWrappedText(node.textContent || '', {
                    font: 'MerriweatherSans',
                    fontSize: FONT_SIZE_H3,
                    weight: 'bold',
                    isTitle: true,
                    lineHeightRatio: LINE_HEIGHT_RATIO_TITLE,
                });
                addSpace(5);
                break;
            case 'p':
                 addWrappedText(node.textContent || '', {
                    font: 'Merriweather',
                    fontSize: FONT_SIZE_BODY,
                    align: 'justify',
                    indent: node.classList.contains('toc-item') ? 0 : 28,
                });
                addSpace(node.classList.contains('toc-item') ? 3 : 5); // Adicionado espaço para itens do sumário
                break;
            case 'div':
                if (node.hasAttribute('data-page') && node.getAttribute('data-page')?.startsWith('title-')) {
                    doc.addPage();
                    resetY();
                    const titleEl = node.querySelector('.chapter-title-standalone');
                    if (titleEl && titleEl.textContent) {
                         addWrappedText(titleEl.textContent, {
                            font: 'Merriweather',
                            fontSize: 22, // AJUSTADO de 24 para 22
                            weight: 'normal',
                            align: 'center',
                            y: pageDimensions.height / 2.3, // AJUSTADO para melhor centralização
                            x: pageDimensions.width / 2,
                            maxWidth: usableWidth * 0.9
                        });
                    }
                    doc.addPage();
                    resetY();
                } else {
                     Array.from(node.children).forEach(child => processNode(child));
                }
                break;
            default:
                break;
        }
    };
    
    const contentStartEl = contentBody.querySelector('[data-page="content-start"]');
    if(contentStartEl) {
        doc.addPage();
        resetY();
        Array.from(contentStartEl.children).forEach(child => processNode(child));
    }


    addHeadersAndFooters();
    doc.save(`${bookTitle.replace(/\s/g, '_')}.pdf`);
};