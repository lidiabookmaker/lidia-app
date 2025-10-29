import jsPDF from 'jspdf';

// --- Constantes de Layout ---
const PAGE_FORMAT = 'a5';
const MARGIN_CM = 2;
const FONT_SIZE_BODY = 12;
const FONT_SIZE_H1 = 24;
const FONT_SIZE_H2 = 18;
const FONT_SIZE_H3 = 14;
const LINE_HEIGHT_RATIO = 1.5;

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
            return true; // Page was added
        }
        return false;
    };
    
    // Helper para adicionar texto com quebra de linha automática
    const addWrappedText = (text: string, options: { fontSize: number; isBold?: boolean; indent?: number; align?: 'left' | 'center' | 'justify'; isTitle?: boolean }) => {
        const { fontSize, isBold = false, indent = 0, align = 'left', isTitle = false } = options;
        const fontStyle = isBold ? 'bold' : 'normal';
        
        doc.setFont('times', fontStyle);
        doc.setFontSize(fontSize);

        const lines = doc.splitTextToSize(text, usableWidth - indent);
        const lineHeight = fontSize * LINE_HEIGHT_RATIO;
        const textHeight = lines.length * lineHeight;
        
        checkAndAddPage(textHeight);

        // Para títulos, evitamos que fiquem órfãos no final da página
        if (isTitle && (currentY + textHeight > pageDimensions.height - marginPt - (lineHeight * 2))) {
            doc.addPage();
            resetY();
        }

        doc.text(lines, marginPt + indent, currentY, { align: align, lineHeightFactor: LINE_HEIGHT_RATIO });
        currentY += textHeight;
    };
    
    const addSpace = (spacePt: number) => {
        currentY += spacePt;
    };

    // --- Processamento do HTML ---
    
    // Capa
    const coverPage = contentBody.querySelector('.cover-page');
    if (coverPage) {
        const title = coverPage.querySelector('.title')?.textContent || '';
        const subtitle = coverPage.querySelector('.subtitle')?.textContent || '';
        const author = coverPage.querySelector('.author')?.textContent || '';
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(40);
        doc.text(doc.splitTextToSize(title, usableWidth * 0.9), pageDimensions.width / 2, pageDimensions.height * 0.4, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(18);
        doc.text(doc.splitTextToSize(subtitle, usableWidth), pageDimensions.width / 2, pageDimensions.height * 0.55, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(16);
        doc.text(author, pageDimensions.width / 2, pageDimensions.height * 0.65, { align: 'center' });
    }
    
    // Página de Copyright
    const copyrightPage = contentBody.querySelector('.copyright-page');
    if (copyrightPage) {
        doc.addPage();
        const year = new Date().getFullYear();
        const author = contentBody.querySelector('.author')?.textContent || 'O Autor';
        const text1 = `Copyright © ${year} ${author}`;
        const text2 = `Todos os direitos reservados...`;

        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        doc.text(text1, pageDimensions.width / 2, pageDimensions.height - marginPt * 2, { align: 'center' });
        doc.text(text2, pageDimensions.width / 2, pageDimensions.height - marginPt * 2 + 12, { align: 'center' });
    }
    
    doc.addPage();
    resetY();
    
    // Processa o resto do conteúdo
    let isFirstParagraphInContext = true;
    const processNode = (node: ChildNode) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        const text = el.textContent?.trim() || '';

        if (!text && !['div'].includes(tagName)) return;

        if (tagName === 'div' && el.classList.contains('chapter-title-break')) {
             doc.addPage();
             doc.setFont('times', 'normal');
             doc.setFontSize(FONT_SIZE_H1);
             doc.text(text, pageDimensions.width / 2, pageDimensions.height / 2, { align: 'center' });
             doc.addPage();
             resetY();
             isFirstParagraphInContext = true;
        } else if (tagName === 'h1') {
             if (!isFirstParagraphInContext) addSpace(30);
             addWrappedText(text, { fontSize: FONT_SIZE_H1, isBold: true, isTitle: true });
             addSpace(15);
             isFirstParagraphInContext = true;
        } else if (tagName === 'h2') {
             addSpace(20);
             addWrappedText(text, { fontSize: FONT_SIZE_H2, isBold: true, isTitle: true });
             addSpace(10);
             isFirstParagraphInContext = true;
        } else if (tagName === 'h3') {
             addSpace(15);
             addWrappedText(text, { fontSize: FONT_SIZE_H3, isBold: true, isTitle: true });
             addSpace(5);
             isFirstParagraphInContext = true;
        } else if (tagName === 'p') {
             const hasIndent = !(el.style.textIndent === '0px' || el.style.textIndent === '') && isFirstParagraphInContext;
             addWrappedText(text, { fontSize: FONT_SIZE_BODY, indent: hasIndent ? 28 : 0, align: 'justify' });
             addSpace(5);
             isFirstParagraphInContext = false;
        }
    };
    
    // Filtra os nós principais para ignorar as páginas já processadas
    const mainContentNodes = Array.from(contentBody.childNodes).filter(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return false;
        const el = node as HTMLElement;
        return !el.classList.contains('cover-page') && !el.classList.contains('copyright-page');
    });

    mainContentNodes.forEach(processNode);

    // --- Adiciona Cabeçalhos e Rodapés ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Não adiciona header e footer na capa (página 1) e copyright (página 2)
        if (i > 2) {
            // Header
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(bookTitle.toUpperCase(), pageDimensions.width / 2, marginPt / 2, { align: 'center' });

            // Footer
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(128, 128, 128);
            doc.text(String(i), pageDimensions.width / 2, pageDimensions.height - (marginPt / 2), { align: 'center' });
            doc.setTextColor(0, 0, 0);
        }
    }

    const safeTitle = bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeTitle}.pdf`);
};
