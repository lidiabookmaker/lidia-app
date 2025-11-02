import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- Constantes de Layout ---
const PAGE_FORMAT = 'a5';
const MARGIN_CM = 2;
const FONT_SIZE_BODY = 11;
const FONT_SIZE_H1 = 24;
const FONT_SIZE_H2 = 18;
const FONT_SIZE_H3 = 14;
const LINE_HEIGHT_RATIO_BODY = 1.6;
const LINE_HEIGHT_RATIO_TITLE = 1.2;

type CustomFont = 'Merriweather' | 'MerriweatherSans' | 'LeagueGothic';
type FontWeight = 'normal' | 'bold' | 'light' | 'italic';
type PdfFontWeight = 'normal' | 'bold' | 'italic' | 'bolditalic';

/**
 * Mapeia as fontes customizadas usadas no HTML para as fontes padrão do PDF.
 * Isso aumenta a confiabilidade da geração do PDF, evitando problemas com
 * o embutimento de fontes. Usamos Times para textos com serifa (corpo) e
 * Helvetica para textos sem serifa (títulos, sumário).
 */
const mapFont = (
    font: CustomFont,
    weight: FontWeight = 'normal'
): { fontName: string; style: PdfFontWeight } => {
    let fontName: string;
    switch (font) {
        case 'Merriweather':
            fontName = 'Times-Roman';
            break;
        case 'MerriweatherSans':
        case 'LeagueGothic':
        default:
            fontName = 'Helvetica';
            break;
    }

    let style: PdfFontWeight = 'normal';
    if (weight === 'bold') style = 'bold';
    if (weight === 'italic') style = 'italic';
    // 'light' será tratado como 'normal' nas fontes padrão do jsPDF.

    return { fontName, style };
};


export const downloadAsPdf = async (bookTitle: string, htmlContent: string) => {
    if (!htmlContent) {
        console.error("No HTML content provided to generate PDF.");
        throw new Error("Conteúdo HTML para o livro não foi encontrado.");
    }

    // --- 1. SETUP ---
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt', // Use points for easier calculations with font sizes
        format: PAGE_FORMAT,
    });
    
    // Create a temporary, off-screen div to parse the HTML
    const renderContainer = document.createElement('div');
    renderContainer.style.position = 'fixed';
    renderContainer.style.left = '-9999px'; // Place it off-screen
    renderContainer.style.top = '0';
    renderContainer.style.width = '14.8cm'; // Set A5 width for html2canvas
    document.body.appendChild(renderContainer);
    renderContainer.innerHTML = htmlContent;
    
    // FIX: The browser strips <html> and <body> tags when setting innerHTML on a div.
    // We should query directly from the container itself, not a non-existent body tag within it.
    if (!renderContainer.hasChildNodes()) {
        document.body.removeChild(renderContainer);
        throw new Error("Could not find any content in the provided HTML.");
    }

    const pageDimensions = {
        width: doc.internal.pageSize.getWidth(),
        height: doc.internal.pageSize.getHeight(),
    };
    const marginPt = MARGIN_CM * 28.3465; // Convert cm to points (1cm = 28.3465pt)
    const usableWidth = pageDimensions.width - (marginPt * 2);
    let currentY = marginPt;

    // --- Helper Functions ---
    const resetY = () => { currentY = marginPt; };
    
    const addPageWithBackground = () => {
        doc.addPage();
        resetY();
    };

    const checkAndAddPage = (requiredHeight: number): boolean => {
        if (currentY + requiredHeight > pageDimensions.height - marginPt) {
            addPageWithBackground();
            return true; // Page was added
        }
        return false; // No page added
    };

    // The core rendering function
    const addWrappedText = (text: string, options: {
        font: CustomFont;
        fontSize: number;
        weight?: FontWeight;
        indent?: number;
        align?: 'left' | 'center' | 'justify';
        color?: string;
        lineHeightRatio?: number;
        isTitle?: boolean; // To prevent titles from being orphaned
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
            color = '#262626',
            lineHeightRatio = LINE_HEIGHT_RATIO_BODY, 
            isTitle = false,
            x = marginPt,
            y = currentY, // Default to the current cursor position
            maxWidth = usableWidth 
        } = options;
        
        const { fontName, style } = mapFont(font, weight);
        doc.setFont(fontName, style);
        doc.setFontSize(fontSize);
        doc.setTextColor(color);

        const lines = doc.splitTextToSize(text, maxWidth - indent);
        const lineHeight = fontSize * lineHeightRatio;
        const textHeight = lines.length * lineHeight;
        
        let effectiveY = y;
        // Only manage page breaks if we are writing to the main flow (y === currentY)
        if (y === currentY) { 
            if(checkAndAddPage(textHeight)) {
              effectiveY = currentY; // Y position was reset to top margin
            }
            // Orphan prevention for titles
            if (isTitle && (effectiveY + textHeight > pageDimensions.height - marginPt - (lineHeight * 2))) {
                addPageWithBackground();
                effectiveY = currentY;
            }
        }
        
        doc.text(lines, x + indent, effectiveY, { align: align, lineHeightFactor: lineHeightRatio, maxWidth: maxWidth - indent });
        
        // Only advance the main cursor if we are writing to the main flow
        if (y === currentY) {
            currentY = effectiveY + textHeight;
        }
    };

    const addSpace = (spacePt: number) => { 
        checkAndAddPage(spacePt);
        currentY += spacePt; 
    };

    // --- 2. PAGE GENERATION ---
    
    // Page 1: Cover (using html2canvas is the best for complex CSS)
    const coverPageEl = renderContainer.querySelector<HTMLElement>('[data-page="cover"]');
    if (coverPageEl) {
        try {
            const canvas = await html2canvas(coverPageEl, { scale: 2, useCORS: true, backgroundColor: null });
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 0, 0, pageDimensions.width, pageDimensions.height, undefined, 'FAST');
        } catch (error) {
            console.error("html2canvas failed for cover page:", error);
            // Fallback: draw a simple text cover if html2canvas fails
            addWrappedText(bookTitle, { font: 'MerriweatherSans', fontSize: 36, weight: 'bold', align: 'center', x: pageDimensions.width / 2, y: pageDimensions.height / 3 });
        }
    }

    // Page 2: Copyright
    addPageWithBackground();
    const copyrightPageEl = renderContainer.querySelector<HTMLElement>('[data-page="copyright"]');
    if (copyrightPageEl) {
        const lines = Array.from(copyrightPageEl.querySelectorAll('p')).map(p => p.textContent || '').join('\n');
        // Position it at the bottom of the page
        addWrappedText(lines, {
            font: 'MerriweatherSans',
            fontSize: 8,
            weight: 'light',
            color: '#595959',
            align: 'center',
            x: pageDimensions.width / 2,
            y: pageDimensions.height - marginPt - 60, // 60pt from bottom margin
        });
    }

    // --- Page 3 onwards: Content ---
    addPageWithBackground(); // Start content on a new page

    // Find the container of all content nodes
    const contentNodes = renderContainer.querySelectorAll('.page-container.content-page, .page-container.chapter-title-page');
    
    // The main layouting loop
    contentNodes.forEach(containerNode => {
        // Handle standalone chapter title pages
        if (containerNode.classList.contains('chapter-title-page')) {
            // If we are not at the top of a page, force a new page for the title
            if (currentY > marginPt + 1) { // +1 to handle tiny float variations
                addPageWithBackground();
            }
            const titleEl = containerNode.querySelector<HTMLElement>('.chapter-title-standalone');
            if (titleEl && titleEl.textContent) {
                 addWrappedText(titleEl.textContent, {
                    font: 'Merriweather',
                    fontSize: FONT_SIZE_H1,
                    weight: 'bold',
                    align: 'center',
                    // Position vertically centered
                    y: pageDimensions.height / 2.5,
                    x: pageDimensions.width / 2,
                    maxWidth: usableWidth * 0.9
                });
            }
            // The content for this chapter will start on the *next* page
            addPageWithBackground();
            return; // Move to the next containerNode
        }

        // Handle regular content pages
        Array.from(containerNode.children).forEach(node => {
            const el = node as HTMLElement;
            const tagName = el.tagName.toLowerCase();
            const text = el.textContent?.trim() || '';
            if (!text) return;

            switch(tagName) {
                case 'h1': // Sumário, Introdução, Conclusão titles
                    addSpace(10); // Space before main title
                    addWrappedText(text, {
                        font: 'Merriweather',
                        fontSize: FONT_SIZE_H1,
                        weight: 'bold',
                        align: 'left',
                        isTitle: true,
                        lineHeightRatio: LINE_HEIGHT_RATIO_TITLE,
                    });
                    addSpace(20); // Space after main title
                    break;
                case 'h2': // Chapter titles within content flow
                    addSpace(10);
                     addWrappedText(text, {
                        font: 'Merriweather',
                        fontSize: FONT_SIZE_H2,
                        weight: 'bold',
                        isTitle: true,
                        lineHeightRatio: LINE_HEIGHT_RATIO_TITLE,
                    });
                    addSpace(10);
                    break;
                case 'h3': // Subchapter titles
                    addSpace(15);
                    addWrappedText(text, {
                        font: 'MerriweatherSans',
                        fontSize: FONT_SIZE_H3,
                        weight: 'bold',
                        isTitle: true,
                        lineHeightRatio: LINE_HEIGHT_RATIO_TITLE,
                    });
                    addSpace(8);
                    break;
                case 'p':
                     const isTocItem = el.classList.contains('toc-item');
                     const isTocChapter = el.classList.contains('toc-chapter');
                     const isTocSubchapter = el.classList.contains('toc-subchapter');
                     const hasIndent = el.classList.contains('indent');
                     
                     addWrappedText(text, {
                        font: isTocItem ? 'MerriweatherSans' : 'Merriweather',
                        fontSize: isTocItem ? 10 : FONT_SIZE_BODY,
                        align: isTocItem ? 'left' : 'justify',
                        weight: isTocChapter ? 'bold' : 'normal',
                        indent: isTocSubchapter ? 20 : (hasIndent ? 25 : 0),
                        lineHeightRatio: isTocItem ? 1.4 : LINE_HEIGHT_RATIO_BODY,
                     });
                     // Add space after paragraphs
                     addSpace(isTocItem ? (isTocChapter ? 8 : 2) : 8);
                    break;
            }
        });
    });

    // --- 3. HEADERS AND FOOTERS ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 3; i <= pageCount; i++) { // Start from page 3 (content page 1)
        doc.setPage(i);
        
        // Header
        const headerFont = mapFont('MerriweatherSans', 'light');
        doc.setFont(headerFont.fontName, headerFont.style);
        doc.setFontSize(9); 
        doc.setTextColor('#595959');
        doc.text(bookTitle.toUpperCase(), marginPt, marginPt / 1.5, { align: 'left' });

        // Footer (Page Number)
        const footerFont = mapFont('MerriweatherSans', 'normal');
        doc.setFont(footerFont.fontName, footerFont.style);
        doc.setFontSize(9);
        doc.setTextColor('#595959');
        doc.text(String(i - 2), pageDimensions.width / 2, pageDimensions.height - (marginPt / 2), { align: 'center' });
    }


    // --- 4. FINALIZE ---
    document.body.removeChild(renderContainer); // Cleanup
    doc.save(`${bookTitle.replace(/[\s:]/g, '_').toLowerCase()}.pdf`);
};