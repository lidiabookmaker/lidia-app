import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Renders HTML content in a hidden, off-screen div to prepare for PDF generation.
 * @param htmlString The full HTML document string.
 * @returns The container element that was added to the DOM.
 */
const createPrintContainer = (htmlString: string): HTMLElement => {
    const container = document.createElement('div');
    // This container is not for display, but for html2canvas to render from.
    // It's styled to be off-screen.
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    // A5 paper width, allowing content to flow naturally downwards.
    container.style.width = '14.8cm'; 
    container.innerHTML = htmlString;
    document.body.appendChild(container);
    return container;
};

/**
 * Removes the temporary print container from the DOM.
 * @param container The element to remove.
 */
const removePrintContainer = (container: HTMLElement) => {
    if (container.parentNode) {
        container.parentNode.removeChild(container);
    }
};

/**
 * Generates and downloads a PDF from an HTML string.
 * It captures the rendered HTML using html2canvas, then paginates the resulting image
 * into an A5 PDF using jsPDF, adding headers and footers to each page.
 * @param bookTitle The title of the book, used for the PDF header and filename.
 * @param htmlContent The full HTML content of the book.
 */
export const downloadAsPdf = async (bookTitle: string, htmlContent: string) => {
    if (!htmlContent) {
        console.error("No HTML content provided to generate PDF.");
        return;
    }

    const printContainer = createPrintContainer(htmlContent);
    
    try {
        const canvas = await html2canvas(printContainer.querySelector('body')!, {
            scale: 2, // Use a higher scale for better resolution
            useCORS: true,
            scrollY: -window.scrollY,
            windowWidth: printContainer.scrollWidth,
            windowHeight: printContainer.scrollHeight
        });
        
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'pt',
            format: 'a5'
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        let heightLeft = pdfHeight;
        let position = 0;

        // Add the first page
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();

        // Add subsequent pages if the content is longer than one page
        while (heightLeft > 0) {
            position = heightLeft - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
        }

        // Add headers and footers to all pages
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);

            // Header: Book title
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            // Using a visually similar font as a fallback for Merriweather Sans 300
            pdf.text(bookTitle.toUpperCase(), pdfWidth / 2, 30, { align: 'center' });

            // Footer: Page number
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(18);
             // Using a visually similar font as a fallback for Merriweather Sans 600
            pdf.setTextColor(128, 128, 128); // 50% gray
            pdf.text(String(i), pdfWidth / 2, pdf.internal.pageSize.getHeight() - 30, { align: 'center' });
            pdf.setTextColor(0, 0, 0); // Reset text color
        }

        const safeTitle = bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        pdf.save(`${safeTitle}.pdf`);

    } catch (error) {
        console.error("Error during PDF generation: ", error);
        throw error; // Propagate error to be caught by the caller
    } finally {
        removePrintContainer(printContainer);
    }
};
