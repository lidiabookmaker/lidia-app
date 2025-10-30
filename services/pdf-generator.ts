import jsPDF from 'jspdf';
import { 
    coverBackgroundImage, 
    leagueGothicBase64,
    merriweatherRegularBase64,
    merriweatherBoldBase64,
    merriweatherSansRegularBase64,
    merriweatherSansBoldBase64,
    merriweatherSansLightBase64,
    merriweatherSansItalicBase64
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
const PAGE_BG_COLOR = '#FAF3E0'; // Cor de fundo creme

const addCustomFonts = (doc: jsPDF) => {
    // VFS = Virtual File System for jsPDF
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
    
    addCustomFonts(doc);

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
    
    const addPageWithBackground = () => {
        doc.addPage();
        doc.setFillColor(PAGE_BG_COLOR);
        doc.rect(0, 0, pageDimensions.width, pageDimensions.height, 'F');
        resetY();
    };

    const checkAndAddPage = (requiredHeight: number) => {
        if (currentY + requiredHeight > pageDimensions.height - marginPt) {
            addPageWithBackground();
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
            color = '#262626',
            lineHeightRatio = LINE_HEIGHT_RATIO_BODY, 
            isTitle = false,
            x = marginPt,
            y = currentY,
            maxWidth = usableWidth 
        } = options;
        
        doc.setFont(font, weight);
        doc.setFontSize(fontSize);
        doc.setTextColor(color);

        const lines = doc.splitTextToSize(text, maxWidth - indent);
        const lineHeight = fontSize * lineHeightRatio;
        const textHeight = lines.length * lineHeight;
        
        let effectiveY = y;
        if (y === currentY) { 
            if(checkAndAddPage(textHeight)) {
              effectiveY = currentY; 
            }
            if (isTitle && (effectiveY + textHeight > pageDimensions.height - marginPt - (lineHeight * 2))) {
                addPageWithBackground();
                effectiveY = currentY;
            }
        }
        
        doc.text(lines, x + indent, effectiveY, { align: align, lineHeightFactor: lineHeightRatio, maxWidth: maxWidth - indent });
        if (y === currentY) {
            currentY = effectiveY + textHeight;
        }
        return textHeight;
    };
    
    const addSpace = (spacePt: number) => { currentY += spacePt; };

    // --- Page 1: Cover ---
    const coverPageEl = contentBody.querySelector('[data-page="cover"]');
    if (coverPageEl) {
        doc.addImage(coverBackgroundImage, 'PNG', 0, 0, pageDimensions.width, pageDimensions.height, undefined, 'FAST');
        const title = coverPageEl.querySelector('.title')?.textContent || '';
        const subtitle = coverPageEl.querySelector('.subtitle')?.textContent || '';
        const author = coverPageEl.querySelector('.author')?.textContent || '';

        let coverY = pageDimensions.height * 0.20;

        const titleHeight = addWrappedText(title.toUpperCase(), {
            font: 'LeagueGothic',
            fontSize: 58,
            weight: 'normal',
            color: '#0d47a1',
            align: 'center',
            x: pageDimensions.width / 2,
            y: coverY,
            maxWidth: usableWidth,
            lineHeightRatio: 1.1
        });
        coverY += titleHeight + 35; 

        const subtitleHeight = addWrappedText(subtitle, {
            font: 'MerriweatherSans',
            fontSize: 16,
            weight: 'italic',
            color: '#212121',
            align: 'center',
            x: pageDimensions.width / 2,
            y: coverY,
            maxWidth: usableWidth * 0.9,
            lineHeightRatio: 1.4
        });
        
        addWrappedText(author, {
            font: 'MerriweatherSans',
            fontSize: 14,
            weight: 'normal',
            color: '#212121',
            align: 'center',
            x: pageDimensions.width / 2,
            y: pageDimensions.height * 0.65,
        });
    }

    // --- Page 2: Copyright ---
    const copyrightPageEl = contentBody.querySelector('[data-page="copyright"]');
    if (copyrightPageEl) {
        addPageWithBackground();
        const lines = Array.from(copyrightPageEl.querySelectorAll('p')).map(p => p.textContent || '');
        const textBlock = lines.join('\n');

        addWrappedText(textBlock, {
            font: 'MerriweatherSans',
            fontSize: 9,
            weight: 'light',
            color: '#595959',
            align: 'center',
            x: pageDimensions.width / 2,
            y: pageDimensions.height - marginPt - 30,
        });
    }

    const addHeadersAndFooters = () => {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 3; i <= pageCount; i++) {
            doc.setPage(i);
            
            doc.setFillColor(PAGE_BG_COLOR);
            doc.rect(0, 0, pageDimensions.width, pageDimensions.height, 'F');

            // Header
            doc.setFont('MerriweatherSans', 'light');
            doc.setFontSize(8); 
            doc.setTextColor('#595959');
            doc.text(bookTitle.toUpperCase(), pageDimensions.width / 2, marginPt / 1.5, { align: 'center' });

            // Footer (Page Number)
            doc.setFont('MerriweatherSans', 'bold');
            doc.setFontSize(12);
            doc.setTextColor('#595959'); // Gray color, slightly darker
            doc.text(String(i), pageDimensions.width / 2, pageDimensions.height - (marginPt / 2), { align: 'center' });
        }
    };

    const processNode = (node: Element) => {
        const tagName = node.tagName.toLowerCase();
        const text = node.textContent || '';
        
        switch(tagName) {
            case 'h1': // Títulos principais (Sumário, Intro, Conclusão)
                 if (node.classList.contains('font-merriweather')) {
                    checkAndAddPage(FONT_SIZE_H1 * LINE_HEIGHT_RATIO_TITLE * 2);
                    addSpace(10);
                    addWrappedText(text, {
                        font: 'Merriweather',
                        fontSize: FONT_SIZE_H1,
                        weight: 'bold', // Titles should be bold
                        align: 'left',
                        isTitle: true,
                        lineHeightRatio: LINE_HEIGHT_RATIO_TITLE,
                    });
                    addSpace(20);
                }
                break;
            case 'h2': // Títulos de Capítulo no conteúdo
                 addWrappedText(text, {
                    font: 'Merriweather',
                    fontSize: FONT_SIZE_H2,
                    weight: 'bold',
                    isTitle: true,
                    lineHeightRatio: LINE_HEIGHT_RATIO_TITLE,
                });
                addSpace(10);
                break;
            case 'h3': // Títulos de Subcapítulo
                addSpace(5);
                addWrappedText(text, {
                    font: 'MerriweatherSans',
                    fontSize: FONT_SIZE_H3,
                    weight: 'bold',
                    isTitle: true,
                    lineHeightRatio: LINE_HEIGHT_RATIO_TITLE,
                });
                addSpace(5);
                break;
            case 'p':
                 const isTocItem = node.classList.contains('toc-item');
                 const isTocChapter = isTocItem && !text.startsWith('•');
                 
                 addWrappedText(text, {
                    font: isTocItem ? 'MerriweatherSans' : 'Merriweather',
                    fontSize: isTocItem ? 11 : FONT_SIZE_BODY,
                    align: 'justify',
                    weight: isTocChapter ? 'bold' : 'normal',
                    indent: isTocItem ? (text.startsWith('•') ? 15 : 0) : 28,
                 });
                 addSpace(isTocItem ? (isTocChapter ? 10 : 2) : 5);
                break;
            case 'div':
                if (node.hasAttribute('data-page') && node.getAttribute('data-page')?.startsWith('title-')) {
                    addPageWithBackground();
                    const titleEl = node.querySelector('.chapter-title-standalone');
                    if (titleEl && titleEl.textContent) {
                         addWrappedText(titleEl.textContent, {
                            font: 'Merriweather',
                            fontSize: 24,
                            weight: 'normal',
                            align: 'center',
                            y: pageDimensions.height / 2.3,
                            x: pageDimensions.width / 2,
                            maxWidth: usableWidth * 0.9
                        });
                    }
                    addPageWithBackground();
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
        addPageWithBackground();
        Array.from(contentStartEl.children).forEach(child => processNode(child));
    }

    addHeadersAndFooters();
    doc.save(`${bookTitle.replace(/\s/g, '_')}.pdf`);
};