import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// FIX: The following font assets are missing from pdf-assets.ts.
// Using merriweatherBoldBase64 as a fallback to allow compilation.
// The correct base64 font data should be added to pdf-assets.ts for proper PDF rendering.
import { 
    leagueGothicBase64,
    merriweatherBoldBase64,
    merriweatherBoldBase64 as merriweatherRegularBase64,
    merriweatherBoldBase64 as merriweatherSansRegularBase64,
    merriweatherBoldBase64 as merriweatherSansBoldBase64,
    merriweatherBoldBase64 as merriweatherSansLightBase64,
    merriweatherBoldBase64 as merriweatherSansItalicBase64
} from './pdf-assets';


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

/**
 * Registra todas as fontes customizadas necessárias para o documento PDF.
 * É crucial que os dados em base64 em 'pdf-assets.ts' estejam corretos.
 */
const addCustomFonts = (doc: jsPDF) => {
    doc.addFileToVFS('LeagueGothic-Regular.ttf', leagueGothicBase64);
    doc.addFont('LeagueGothic-Regular.ttf', 'LeagueGothic', 'normal');

    doc.addFileToVFS('Merriweather-Regular.ttf', merriweatherRegularBase64);
    doc.addFont('Merriweather-Regular.ttf', 'Merriweather', 'normal');
    doc.addFileToVFS('Merriweather-Bold.ttf', merriweatherBoldBase64);
    doc.addFont('Merriweather-Bold.ttf', 'Merriweather', 'bold');

    doc.addFileToVFS('MerriweatherSans-Regular.ttf', merriweatherSansRegularBase64);
    doc.addFont('MerriweatherSans-Regular.ttf', 'MerriweatherSans', 'normal');
    doc.addFileToVFS('MerriweatherSans-Bold.ttf', merriweatherSansBoldBase64);
    doc.addFont('MerriweatherSans-Bold.ttf', 'MerriweatherSans', 'bold');
    doc.addFileToVFS('MerriweatherSans-Light.ttf', merriweatherSansLightBase64);
    doc.addFont('MerriweatherSans-Light.ttf', 'MerriweatherSans', 'light');
    doc.addFileToVFS('MerriweatherSans-Italic.ttf', merriweatherSansItalicBase64);
    doc.addFont('MerriweatherSans-Italic.ttf', 'MerriweatherSans', 'italic');
};


export const downloadAsPdf = async (bookTitle: string, htmlContent: string) => {
    if (!htmlContent) {
        console.error("No HTML content provided to generate PDF.");
        throw new Error("Conteúdo HTML para o livro não foi encontrado.");
    }

    // --- 1. SETUP ---
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: PAGE_FORMAT,
    });
    addCustomFonts(doc);
    
    const renderContainer = document.createElement('div');
    renderContainer.style.position = 'fixed';
    renderContainer.style.left = '-9999px';
    renderContainer.style.top = '0';
    renderContainer.style.width = '14.8cm';
    document.body.appendChild(renderContainer);
    renderContainer.innerHTML = htmlContent;

    const bodyEl = renderContainer.querySelector('body');
    if (!bodyEl) {
        document.body.removeChild(renderContainer);
        throw new Error("Could not find body in HTML content");
    }


    const pageDimensions = {
        width: doc.internal.pageSize.getWidth(),
        height: doc.internal.pageSize.getHeight(),
    };
    const marginPt = MARGIN_CM * 28.3465;
    const usableWidth = pageDimensions.width - (marginPt * 2);
    let currentY = marginPt;

    // --- Helper Functions ---
    const addPage = () => {
        doc.addPage();
        currentY = marginPt;
    };
    
    const addText = (text: string, options: {
        font: CustomFont;
        fontSize: number;
        weight?: FontWeight;
        indent?: number;
        align?: 'left' | 'center' | 'justify';
        color?: string;
        lineHeightRatio?: number;
        isTitle?: boolean;
        marginTop?: number;
        marginBottom?: number;
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
            marginTop = 0,
            marginBottom = 0,
            x = marginPt,
            y,
            maxWidth = usableWidth,
        } = options;

        const isAbsolutePosition = y !== undefined;
        let yPos = isAbsolutePosition ? y : currentY;

        doc.setFont(font, weight);
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxWidth - indent);
        const lineHeight = fontSize * lineHeightRatio;
        const textHeight = lines.length * lineHeight;

        if (!isAbsolutePosition) {
            // Handle marginTop
            if (yPos + marginTop > pageDimensions.height - marginPt) {
                addPage();
                yPos = currentY;
            }
            yPos += marginTop;

            // Check if the text itself fits (with orphan control for titles)
            let requiredHeight = textHeight;
            if (isTitle) {
                requiredHeight += (FONT_SIZE_BODY * LINE_HEIGHT_RATIO_BODY) * 2; // Buffer for 2 lines
            }
            if (yPos + requiredHeight > pageDimensions.height - marginPt) {
                addPage();
                yPos = currentY;
            }
        }
        
        doc.setTextColor(color);
        const textX = (align === 'center') ? (pageDimensions.width / 2) : (x + indent);
        
        // Draw text line by line for precise control
        lines.forEach((line: string, index: number) => {
             const lineY = yPos + (index * lineHeight);
             doc.text(line, textX, lineY, { 
                align: align, 
                maxWidth: maxWidth - indent 
            });
        });
        
        if (!isAbsolutePosition) {
            currentY = yPos + textHeight;

            // Handle marginBottom
            if (currentY + marginBottom > pageDimensions.height - marginPt) {
                addPage();
            } else {
                currentY += marginBottom;
            }
        }
    };

    // --- 2. PAGE GENERATION ---
    const coverPageEl = bodyEl.querySelector<HTMLElement>('[data-page="cover"]');
    if (coverPageEl) {
        const canvas = await html2canvas(coverPageEl, { scale: 2.5, useCORS: true, backgroundColor: null });
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageDimensions.width, pageDimensions.height, undefined, 'FAST');
    }

    addPage();
    const copyrightPageEl = bodyEl.querySelector<HTMLElement>('[data-page="copyright"]');
    if (copyrightPageEl) {
        const lines = Array.from(copyrightPageEl.querySelectorAll('p')).map(p => p.textContent || '').join('\n');
        const textHeight = doc.getTextDimensions(lines, { fontSize: 8, lineHeightFactor: 1.4 }).h;
        addText(lines, {
            font: 'MerriweatherSans',
            fontSize: 8,
            weight: 'light',
            color: '#595959',
            align: 'center',
            x: pageDimensions.width / 2,
            y: pageDimensions.height - marginPt - textHeight,
            lineHeightRatio: 1.4,
        });
    }

    // --- Page 3 onwards: Content ---
    const contentNodes = bodyEl.querySelectorAll('.page-container.content-page, .page-container.chapter-title-page');
    
    contentNodes.forEach((containerNode, index) => {
        if (containerNode.classList.contains('chapter-title-page')) {
            if (index > 0) { addPage(); } // Add a new page for the title page itself
            const titleEl = containerNode.querySelector<HTMLElement>('.chapter-title-standalone');
            if (titleEl && titleEl.textContent) {
                 addText(titleEl.textContent, {
                    font: 'Merriweather', fontSize: FONT_SIZE_H1, weight: 'bold', align: 'center',
                    y: pageDimensions.height / 2.5, x: pageDimensions.width / 2, maxWidth: usableWidth * 0.9,
                });
            }
            addPage(); // Content starts on the next page
            return;
        }
        
        // For the very first content page (Sumário), start a new page.
        if (index === 0) {
            addPage();
        }

        Array.from(containerNode.children).forEach(node => {
            const el = node as HTMLElement;
            const tagName = el.tagName.toLowerCase();
            const text = el.textContent?.trim() || '';
            if (!text) return;

            switch(tagName) {
                case 'h1':
                    addText(text, { font: 'Merriweather', fontSize: FONT_SIZE_H1, weight: 'bold', align: 'left', isTitle: true, lineHeightRatio: LINE_HEIGHT_RATIO_TITLE, marginTop: 0, marginBottom: 24 });
                    break;
                case 'h2':
                     addText(text, { font: 'Merriweather', fontSize: FONT_SIZE_H2, weight: 'bold', isTitle: true, lineHeightRatio: LINE_HEIGHT_RATIO_TITLE, marginTop: 20, marginBottom: 12 });
                    break;
                case 'h3':
                    addText(text, { font: 'MerriweatherSans', fontSize: FONT_SIZE_H3, weight: 'bold', isTitle: true, lineHeightRatio: LINE_HEIGHT_RATIO_TITLE, marginTop: 18, marginBottom: 8 });
                    break;
                case 'p':
                     const isTocItem = el.classList.contains('toc-item');
                     const isTocChapter = el.classList.contains('toc-chapter');
                     const isTocSubchapter = el.classList.contains('toc-subchapter');
                     const hasIndent = el.classList.contains('indent');
                     
                     addText(text, {
                        font: isTocItem ? 'MerriweatherSans' : 'Merriweather',
                        fontSize: isTocItem ? 10 : FONT_SIZE_BODY,
                        align: isTocItem ? 'left' : 'justify',
                        weight: isTocChapter ? 'bold' : 'normal',
                        indent: isTocSubchapter ? 20 : (hasIndent ? 25 : 0),
                        lineHeightRatio: isTocItem ? 1.4 : LINE_HEIGHT_RATIO_BODY,
                        marginBottom: isTocItem ? (isTocChapter ? 8 : 4) : 10,
                     });
                    break;
            }
        });
    });

    // --- 3. HEADERS AND FOOTERS ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 3; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('MerriweatherSans', 'light');
        doc.setFontSize(9); 
        doc.setTextColor('#595959');
        doc.text(bookTitle.toUpperCase(), marginPt, marginPt / 1.5, { align: 'left' });

        doc.setFont('MerriweatherSans', 'normal');
        doc.text(String(i - 2), pageDimensions.width / 2, pageDimensions.height - (marginPt / 2), { align: 'center' });
    }

    // --- 4. FINALIZE ---
    document.body.removeChild(renderContainer);
    doc.save(`${bookTitle.replace(/[\s:]/g, '_').toLowerCase()}.pdf`);
};