import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak } from 'docx';
import type { Book, BookPart } from '../types';
import { Button } from './ui/Button';
import { supabase } from '../services/supabase';
import { Card } from './ui/Card';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { assembleFullHtml, assemblePartHtml } from '../services/bookFormatter';

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

  // ✅ Sucesso e URL final
  const [finalPdfUrl, setFinalPdfUrl] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadParts = async () => {
      try {
        const { data, error } = await supabase
          .from('book_parts')
          .select('*')
          .eq('book_id', book.id)
          .order('part_index');

        if (error) throw error;
        setBookParts(data as BookPart[]);
        setFullHtml(assembleFullHtml(book, data as BookPart[]));
      } catch (e) {
        setError("Erro ao carregar o livro.");
      } finally {
        setIsLoadingParts(false);
      }
    };
    loadParts();
  }, [book]);

  const updateLog = (msg: string) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  // ✅ Salvar PDF e mostrar tela final
  async function finishAndShowSuccess(finalPdfBytes: Uint8Array) {
    updateLog("📤 Enviando PDF final para a nuvem...");

    const file = new File([finalPdfBytes], "final.pdf", { type: "application/pdf" });

    const { error } = await supabase.storage
      .from("books")
      .upload(`${book.id}/final.pdf`, file, { upsert: true });

    if (error) {
      alert("Erro ao salvar PDF.");
      return;
    }

    const url = `${supabase.storageUrl}/object/public/books/${book.id}/final.pdf`;

    setFinalPdfUrl(url);
    updateLog("✅ Livro final salvo com sucesso!");

    setTimeout(() => successRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
  }

  // ✅ Geração de PDF — ALTERAÇÃO FINAL
  const handleGeneratePdf = async () => {
    if (!bookParts.length) return alert("Livro não carregado.");

    setIsGenerating(true);
    setLog([]);
    updateLog("Iniciando geração do livro...");

    try {
      const pdfBuffers: ArrayBuffer[] = [];

      for (const part of bookParts) {
        updateLog(`Gerando parte: ${part.part_type}`);
        const html = assemblePartHtml(book, part);

        const margin: [number, number, number, number] =
          part.part_type === "cover" ? [0,0,0,0] : [2.4, 2, 2.7, 2];

        const opt = {
          margin,
          filename: `${part.part_type}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "cm", format: "a5", orientation: "portrait" }
        };

        const bytes = await html2pdf().from(html).set(opt).output("arraybuffer");
        pdfBuffers.push(bytes);
      }

      updateLog("📎 Montando PDF final...");

      const final = await PDFDocument.create();

      for (const buffer of pdfBuffers) {
        const pdf = await PDFDocument.load(buffer);
        const pages = await final.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => final.addPage(p));
      }

      const bytes = await final.save();

      // ✅ Salvar no Supabase e mostrar tela final
      await finishAndShowSuccess(bytes);
      return;

    } catch (e: any) {
      alert("Erro ao gerar PDF: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // ✅ Tela final
  if (finalPdfUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center p-6" ref={successRef}>
        <img src="/logo-lydia.png" className="h-20 mb-6 opacity-80" alt="Lydia" />
        <h1 className="text-3xl font-bold mb-4 text-gray-800">🎉 Parabéns!</h1>
        <p className="text-lg text-gray-600 mb-6 max-w-lg">
          Seu livro digital está pronto! Clique no botão abaixo para baixar.
        </p>
        <a
          href={finalPdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow"
        >
          📚 Baixar meu livro
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <Button onClick={() => onNavigate('dashboard')} variant="secondary">
            <ArrowLeftIcon /> Voltar
          </Button>
        </header>

        <Card className="text-center p-6">
          <h3 className="text-xl font-bold">Gerar Arquivo Final</h3>
          <div className="mt-4 flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={handleGeneratePdf} isLoading={isGenerating} disabled={isGeneratingDocx}>
              <GenerateIcon /> Gerar PDF Final
            </Button>
          </div>
        </Card>

        <h2 className="mt-6 text-2xl font-bold">Log</h2>
        <div ref={logContainerRef} className="bg-black text-green-400 p-3 rounded h-64 overflow-y-auto text-sm mt-2">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>

        <h2 className="mt-6 text-2xl font-bold">Pré-visualização</h2>
        <div className="bg-white rounded shadow mt-2">
          {isLoadingParts ? (
            <div className="h-[70vh] flex justify-center items-center"><LoadingSpinner/></div>
          ) : (
            <iframe ref={iframeRef} srcDoc={fullHtml || ''} className="w-full h-[70vh] border-0" />
          )}
        </div>
      </div>
    </div>
  );
};
