import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import type { Book, BookPart } from '../types';
import { Button } from './ui/Button';
import { supabase } from '../services/supabase';
import { Card } from './ui/Card';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { assembleFullHtml, assemblePartHtml } from '../services/bookFormatter';
/* INSERINDO CONEXÃO PARA GERAR PDF */
import { generateFullPdf } from "../services/pdf-generator";


const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);
const GenerateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m10 15-2-2 2-2"/><path d="m14 15 2-2-2-2"/></svg>
);

const DocxIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);


interface ViewBookPageProps {
  book: Book;
  onNavigate: (page: 'dashboard') => void;
}

export const ViewBookPage: React.FC<ViewBookPageProps> = ({ book, onNavigate }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [bookParts, setBookParts] = useState<BookPart[]>([]);
  const [fullHtml, setFullHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  /* NOVOS const gpt */
  // const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [testingMessage, setTestingMessage] = useState<string | null>(null);

  
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  useEffect(() => {
    const fetchAndAssemble = async () => {
      setIsLoadingParts(true);
      setError(null);
      try {
        const { data: parts, error: fetchError } = await supabase
          .from('book_parts')
          .select('*')
          .eq('book_id', book.id)
          .order('part_index', { ascending: true });

        if (fetchError) throw fetchError;
        if (!parts || parts.length === 0) throw new Error("Nenhuma parte do livro foi encontrada.");

        setBookParts(parts as BookPart[]);
        const assembledHtml = assembleFullHtml(book, parts as BookPart[]);
        setFullHtml(assembledHtml);

      } catch (err) {
        console.error("Error fetching or assembling book parts:", err);
        setError(`Não foi possível carregar o conteúdo do livro: ${(err as Error).message}`);
      } finally {
        setIsLoadingParts(false);
      }
    };
    fetchAndAssemble();
  }, [book.id, book]);

  const updateLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };
  
  const handleTestBackendPdf = async () => {
    if (!fullHtml) {
        alert("O conteúdo HTML do livro ainda não foi gerado. Aguarde o carregamento da pré-visualização.");
        updateLog("❌ Tentativa de gerar PDF do backend falhou: HTML não disponível.");
        return;
    }

    setIsTestingBackend(true);
    setLog([]); // Clear previous logs for this specific action
    updateLog(`Enviando HTML completo (${(fullHtml.length / 1024).toFixed(1)} KB) para a função de backend...`);

    try {
        // FIX: Removed the invalid 'responseType' property. The backend function has been updated to return
        // a JSON object with a base64-encoded PDF, which is compatible with the `invoke` helper.
        const { data, error } = await supabase.functions.invoke<{pdfBase64: string}>("generate-pdf", {
            body: { html: fullHtml },
        });

        if (error) {
            // Supabase wraps function errors. If it's a blob, it might contain a JSON error message.
            if (error.context && error.context.blob) {
                try {
                    const errorJsonText = await error.context.blob.text();
                    const errorObj = JSON.parse(errorJsonText);
                    throw new Error(errorObj.error || errorObj.message || 'Erro desconhecido retornado pelo backend.');
                } catch (parseError) {
                    // Fallback if the blob isn't valid JSON
                    throw new Error(error.message || 'Falha na comunicação com o backend.');
                }
            }
            throw error;
        }

        updateLog("PDF recebido do backend. Preparando download...");

        // FIX: Decode the base64 string from the JSON response to create the PDF blob.
        if (!data?.pdfBase64) {
            throw new Error("A resposta do backend não continha os dados do PDF esperados.");
        }

        const byteCharacters = atob(data.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${book.title.replace(/ /g, '_')}_backend.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        updateLog("✅ Download do PDF gerado pelo backend iniciado com sucesso!");
    } catch (err: any) {
        console.error("Erro ao gerar PDF no backend:", err);
        updateLog(`❌ ERRO: ${err.message}`);
        alert(`Erro ao gerar PDF no backend: ${err.message}`);
    } finally {
        setIsTestingBackend(false);
    }
};

const handleGeneratePdf = async () => {
    if (bookParts.length === 0) {
        alert("As partes do livro não estão carregadas. Tente novamente.");
        return;
    }

    setIsGenerating(true);
    setLog([]);
    updateLog("Iniciando pipeline de geração de PDF...");

    const generatedPdfBuffers: ArrayBuffer[] = [];

    try {
        // Itera sobre cada parte do livro na ordem correta para gerar os PDFs.
        for (const part of bookParts) {
            updateLog(`Gerando PDF para a parte '${part.part_type}' (índice ${part.part_index})...`);
            
            // A biblioteca html2pdf precisa de um documento HTML completo para funcionar.
            const partFullHtml = assemblePartHtml(book, part);

            // As opções definem o formato da página e a qualidade.
            // A margem é crucial para a diagramação. A capa não tem margens.
            // FIX: Explicitly type `margin` as a tuple. TypeScript infers `number[]` from the ternary operator,
            // which doesn't satisfy html2pdf's expected `[number, number, number, number]` type for margins.
            const margin: [number, number, number, number] = part.part_type === 'cover' ? [0,0,0,0] : [2.4, 2, 2.7, 2];
            const opt = {
                margin: margin, // [top, left, bottom, right] em cm
                filename: `${part.part_type}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'cm', format: 'a5', orientation: 'portrait' as const }
            };

            // `html2pdf` lida com a paginação automaticamente para conteúdos longos.
            const pdfBytes = await html2pdf().from(partFullHtml).set(opt).output('arraybuffer');
            generatedPdfBuffers.push(pdfBytes);
            
            const tempDoc = await PDFDocument.load(pdfBytes);
            updateLog(`... Sucesso (${tempDoc.getPageCount()} páginas)`);
        }

        // --- FASE FINAL: Montagem do Documento ---
        updateLog("Todas as partes geradas. Iniciando montagem final do documento...");
        const finalPdfDoc = await PDFDocument.create();

        for (const buffer of generatedPdfBuffers) {
            const partPdfDoc = await PDFDocument.load(buffer);
            const copiedPages = await finalPdfDoc.copyPages(partPdfDoc, partPdfDoc.getPageIndices());
            copiedPages.forEach(page => finalPdfDoc.addPage(page));
        }

        updateLog("Adicionando cabeçalhos e numeração de página...");
        const pages = finalPdfDoc.getPages();
        const helveticaFont = await finalPdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBoldFont = await finalPdfDoc.embedFont(StandardFonts.HelveticaBold);
        const royalBlue = rgb(0, 0.137, 0.4);
        const blackTransparent = rgb(0, 0, 0);

        // Adiciona cabeçalho e rodapé em todas as páginas, exceto na primeira (capa).
        for (let i = 0; i < pages.length; i++) {
            const pageCounter = i + 1;
            if (pageCounter > 1) { // Pula a capa
                const page = pages[i];
                const { width, height } = page.getSize();
                
                // Cabeçalho com o título do livro
                const headerText = book.title.toUpperCase();
                const headerTextWidth = helveticaFont.widthOfTextAtSize(headerText, 8);
                page.drawText(headerText, {
                    x: (width - headerTextWidth) / 2,
                    y: height - 1.3 * 28.35, // 1.3cm do topo
                    font: helveticaFont, size: 8, color: royalBlue,
                });

                // Rodapé com o número da página
                const footerText = String(pageCounter);
                const footerTextWidth = helveticaBoldFont.widthOfTextAtSize(footerText, 16);
                page.drawText(footerText, {
                    x: (width - footerTextWidth) / 2,
                    y: 1.35 * 28.35, // 1.35cm da base
                    font: helveticaBoldFont, size: 16, color: blackTransparent, opacity: 0.4,
                });
            }
        }
        
        const finalPageCount = finalPdfDoc.getPageCount();
        updateLog(`Montagem finalizada com ${finalPageCount} páginas. Preparando para download...`);
        const finalPdfBytes = await finalPdfDoc.save();

        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${book.title.replace(/ /g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        updateLog("Download iniciado. Processo concluído!");

    } catch (error) {
        console.error("PDF Generation Pipeline Error:", error);
        const errMessage = `Ocorreu um erro: ${(error as Error).message}`;
        updateLog(`ERRO: ${errMessage}`);
        alert(errMessage);
    } finally {
        setIsGenerating(false);
    }
  };
  
async function handleGeneratePdf() {
  try {
    setIsGenerating(true);
    setError(null);

    // book.id é obrigatório
    if (!book?.id) {
      setError("Livro não carregado.");
      return;
    }

    const url = await generateFullPdf(book.id);

    if (!url) {
      setError("Falha ao gerar PDF.");
      return;
    }

    // abre o PDF num blob temporário
    const win = window.open(url, "_blank");
    if (!win) alert("Seu navegador bloqueou o pop-up. Abra manualmente na barra abaixo.");

  } catch (err) {
    console.error(err);
    setError("Erro ao gerar PDF final.");
  } finally {
    setIsGenerating(false);
  }
}



  const handleGenerateDocx = async () => {
    if (bookParts.length === 0) {
        alert("As partes do livro não estão carregadas. Tente novamente.");
        return;
    }
    setIsGeneratingDocx(true);
    updateLog("Iniciando geração do arquivo DOCX...");

    try {
        const docChildren: (Paragraph | any)[] = [];

        const createParagraphs = (text: string, firstParaNoIndent = false) => {
            if (!text) return [];
            const lines = text.split('\n').filter(p => p.trim() !== '');
            return lines.map((line, index) => {
                // FIX: Explicitly typed `indentation` to allow an empty object, resolving the TypeScript error.
                let indentation: { firstLine?: number } = { firstLine: 720 }; // 0.5 inch in twips
                if (firstParaNoIndent && index === 0) {
                    indentation = {}; 
                }
                return new Paragraph({
                    children: [new TextRun(line.trim())],
                    style: "default",
                    indent: indentation,
                });
            });
        };

        bookParts.forEach(part => {
            let content;
            try {
                content = JSON.parse(part.content);
            } catch (e) {
                content = { content: part.content };
            }

            switch (part.part_type) {
                case 'cover':
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: content.title, bold: true, size: 72 })],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 }
                    }));
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: content.subtitle, size: 36, italics: true })],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 800 }
                    }));
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: content.author, size: 28 })],
                        alignment: AlignmentType.CENTER
                    }));
                    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
                    break;
                case 'copyright':
                    const copyrightText = typeof content === 'string' ? content : (content.content || `Copyright © ${new Date().getFullYear()} ${book.author}`);
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: copyrightText, size: 18 })],
                        alignment: AlignmentType.CENTER,
                    }));
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: "Todos os direitos reservados.", size: 18 })],
                        alignment: AlignmentType.CENTER,
                    }));
                     docChildren.push(new Paragraph({
                        children: [new TextRun({ text: "Este livro ou qualquer parte dele não pode ser reproduzido ou usado de forma alguma sem a permissão expressa por escrito do editor, exceto pelo uso de breves citações em uma resenha do livro.", size: 18 })],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200 }
                    }));
                    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
                    break;
                case 'toc':
                    docChildren.push(new Paragraph({ text: content.title, style: "Heading1", alignment: AlignmentType.LEFT }));
                    content.content.split('\n').forEach((line: string) => {
                         line = line.trim();
                         if (!line) return;
                         const isChapter = line.match(/^capítulo \d+:/i);
                         docChildren.push(new Paragraph({
                            children: [new TextRun({ text: line, bold: !!isChapter })],
                            indent: isChapter ? {} : { left: 720 }
                         }));
                    });
                    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
                    break;
                case 'introduction':
                case 'conclusion':
                    docChildren.push(new Paragraph({ text: content.title, style: "Heading1" }));
                    createParagraphs(content.content, false).forEach(p => docChildren.push(p));
                    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
                    break;
                case 'chapter_title':
                     docChildren.push(new Paragraph({
                        text: content.title,
                        style: "Heading1",
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 2000, after: 2000 }
                    }));
                    break;
                case 'chapter_content':
                     docChildren.push(new Paragraph({ text: content.title, style: "Heading2" }));
                    createParagraphs(content.introduction, true).forEach(p => docChildren.push(p));
                    content.subchapters.forEach((sub: any) => {
                        docChildren.push(new Paragraph({ text: sub.title, style: "Heading3" }));
                        createParagraphs(sub.content, true).forEach(p => docChildren.push(p));
                    });
                    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
                    break;
                default:
                    break;
            }
        });
        updateLog("Estrutura do documento criada. Gerando o arquivo...");

        const doc = new Document({
             styles: {
                paragraphStyles: [
                    {
                        id: "default", name: "Default", basedOn: "Normal", next: "Normal", quickFormat: true,
                        run: { font: "Merriweather", size: 25 }, // 12.5pt
                        paragraph: { spacing: { after: 160 }, alignment: AlignmentType.JUSTIFIED }
                    },
                    {
                        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                        run: { font: "Merriweather", size: 56, bold: true }, // 28pt
                        paragraph: { spacing: { before: 240, after: 120 } }
                    },
                    {
                        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
                        run: { font: "Merriweather", size: 44, bold: true }, // 22pt
                         paragraph: { spacing: { before: 240, after: 120 } }
                    },
                    {
                        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
                        run: { font: "Merriweather Sans", size: 32, bold: true }, // 16pt
                         paragraph: { spacing: { before: 240, after: 120 } }
                    }
                ]
            },
            sections: [{ children: docChildren }]
        });

        const blob = await Packer.toBlob(doc);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${book.title.replace(/ /g, '_')}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        updateLog("Download do DOCX iniciado. Processo concluído!");
    } catch (error) {
        console.error("DOCX Generation Error:", error);
        const errMessage = `Ocorreu um erro ao gerar o DOCX: ${(error as Error).message}`;
        updateLog(`ERRO: ${errMessage}`);
        alert(errMessage);
    } finally {
        setIsGeneratingDocx(false);
    }
  }


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      {/* O container de renderização foi removido pois não é mais necessário com a nova abordagem. */}
      
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <Button onClick={() => onNavigate('dashboard')} variant="secondary" className="inline-flex items-center w-full sm:w-auto">
                <ArrowLeftIcon />
                Voltar
            </Button>
            <div className="text-sm text-gray-600">
                A edição de conteúdo foi desativada nesta versão para garantir a estabilidade da geração de PDF.
            </div>
        </header>

        {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Erro!</strong>
                <span className="block sm:inline"> {error}</span>
            </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:col-span-2 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-1">{book.title}</h1>
                <h2 className="text-xl text-gray-600">{book.subtitle}</h2>
                <p className="text-sm text-gray-500 mt-1">por {book.author}</p>
            </div>
            
            <Card className="lg:col-span-2 text-center">
                <h3 className="text-xl font-bold text-gray-800">Gerar Arquivos Finais</h3>
                <p className="text-gray-600 mt-2">Clique nos botões abaixo para gerar os arquivos do seu livro.</p>
                <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                    <Button 
                      onClick={handleGeneratePdf} 
                      className="text-lg w-full sm:w-auto" 
                      isLoading={isGenerating || isLoadingParts}
                      loadingText={isLoadingParts ? "Carregando..." : "Gerando PDF..."}
                      disabled={isLoadingParts || !!error || isGenerating || isGeneratingDocx || isTestingBackend}
                    >
                        <GenerateIcon/>
                        Gerar PDF Final
                    </Button>
                    <Button 
                      onClick={handleGenerateDocx} 
                      className="text-lg w-full sm:w-auto" 
                      variant="secondary"
                      isLoading={isGeneratingDocx}
                      loadingText="Gerando DOCX..."
                      disabled={isLoadingParts || !!error || isGenerating || isGeneratingDocx || isTestingBackend}
                    >
                        <DocxIcon/>
                        Baixar .DOCX
                    </Button>
                    <Button 
                      onClick={handleTestBackendPdf} 
                      className="text-lg w-full sm:w-auto" 
                      variant="secondary"
                      isLoading={isTestingBackend}
                      loadingText="Testando..."
                      disabled={isLoadingParts || !!error || isGenerating || isGeneratingDocx || isTestingBackend}
                    >
                        Testar PDF Backend
                    </Button>
                </div>
            </Card>

            <div className="lg:col-span-2">
                 <h2 className="text-2xl font-bold text-gray-800 mb-4">Log de Geração</h2>
                 <div ref={logContainerRef} className="bg-gray-900 text-white font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto mb-4 flex-grow">
                  {log.length === 0 && <p className="text-gray-400">Aguardando início da geração...</p>}
                  {log.map((line, index) => <p key={index} className="whitespace-pre-wrap">{line}</p>)}
                </div>
            </div>

            <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Pré-visualização do Conteúdo</h2>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {isLoadingParts ? (
                        <div className="h-[80vh] flex justify-center items-center"><LoadingSpinner/></div>
                    ) : error ? (
                         <div className="h-[80vh] flex justify-center items-center text-red-600 p-4">{error}</div>
                    ) : (
                        <iframe
                            ref={iframeRef}
                            srcDoc={fullHtml || ''}
                            title={book.title}
                            className="w-full border-0 h-[80vh]"
                            sandbox="allow-scripts allow-same-origin"
                        />
                    )}
                </div>
            </div>
        </main>
      </div>
    </div>
  );
};