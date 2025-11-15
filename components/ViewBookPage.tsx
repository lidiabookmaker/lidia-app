import React, { useState, useRef, useEffect } from "react";
import type { Book, BookPart } from "../types";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { supabase } from "../services/supabase";

import { assembleFullHtml } from "../services/bookFormatter";
import { generateFullPdf } from "../services/pdf-generator"; // WeasyPrint endpoint oficial

/* ======================================================================= */
/* ========================== ÍCONES SVG ================================= */
/* ======================================================================= */

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
       viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className="h-5 w-5 mr-2">
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const GenerateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
       viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className="h-5 w-5 mr-2">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="m10 15-2-2 2-2"/>
    <path d="m14 15 2-2-2-2"/>
  </svg>
);

const DocxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
       viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className="h-5 w-5 mr-2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

/* ======================================================================= */
/* =========================== COMPONENTE ================================= */
/* ======================================================================= */

interface ViewBookPageProps {
  book: Book;
  onNavigate: (page: "dashboard") => void;
}

export const ViewBookPage: React.FC<ViewBookPageProps> = ({ book, onNavigate }) => {
  const [bookParts, setBookParts] = useState<BookPart[]>([]);
  const [fullHtml, setFullHtml] = useState<string | null>(null);

  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [isTestingBackend, setIsTestingBackend] = useState(false);

  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  /* ======================================================================= */
  /* ========================= LOG AUTOMÁTICO ============================== */
  /* ======================================================================= */

  const updateLog = (msg: string) =>
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  /* ======================================================================= */
  /* ======================== CARREGAR PARTES DO LIVRO ===================== */
  /* ======================================================================= */

  useEffect(() => {
    const loadParts = async () => {
      try {
        setIsLoadingParts(true);
        const { data, error: err } = await supabase
          .from("book_parts")
          .select("*")
          .eq("book_id", book.id)
          .order("part_index", { ascending: true });

        if (err) throw err;
        if (!data || data.length === 0) throw new Error("Nenhuma parte encontrada.");

        setBookParts(data as BookPart[]);
        setFullHtml(assembleFullHtml(book, data as BookPart[]));
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Erro ao carregar partes");
      } finally {
        setIsLoadingParts(false);
      }
    };

    loadParts();
  }, [book.id]);

  /* ======================================================================= */
/* === COLE A PARTE 2 AQUI === */
  /* ======================================================================= */
  /* ======================= TESTAR BACKEND (WeasyPrint) ==================== */
  /* ======================================================================= */

  const handleTestBackendPdf = async () => {
    if (!fullHtml) {
      alert("O HTML ainda não foi montado.");
      return;
    }

    try {
      setIsTestingBackend(true);
      setLog([]);
      updateLog("Enviando HTML para teste no backend WeasyPrint...");

      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: { html: fullHtml },
      });

      if (error) {
        console.error(error);
        throw new Error(error.message || "Erro desconhecido no backend");
      }

      if (!data?.pdfBase64) {
        throw new Error("Backend não retornou PDF.");
      }

      updateLog("PDF recebido do backend. Baixando...");

      const bytes = Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      updateLog("✔ PDF de teste aberto com sucesso!");
    } catch (err: any) {
      updateLog("❌ ERRO: " + err.message);
      alert(err.message);
    } finally {
      setIsTestingBackend(false);
    }
  };

  /* ======================================================================= */
  /* ======================= GERAR PDF FINAL (WeasyPrint) =================== */
  /* ======================================================================= */

  const handleGeneratePdf = async () => {
    try {
      if (!book?.id) throw new Error("Livro não carregado.");

      setIsGenerating(true);
      setError(null);
      setLog([]);
      updateLog("Iniciando geração de PDF final via WeasyPrint...");

      const url = await generateFullPdf(book.id);

      if (!url) throw new Error("Falha ao gerar PDF.");

      updateLog("✔ PDF gerado. Abrindo...");
      window.open(url, "_blank");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao gerar PDF final.");
    } finally {
      setIsGenerating(false);
    }
  };

  /* ======================================================================= */
  /* ============================ GERAR DOCX =============================== */
  /* ======================================================================= */

  const handleGenerateDocx = async () => {
    try {
      if (bookParts.length === 0) {
        alert("Partes não carregadas.");
        return;
      }

      setIsGeneratingDocx(true);
      setLog([]);

      updateLog("Montando documento DOCX...");

      /** IMPORTANTE:
       * para manter o arquivo mais limpo e modular,
       * o DOCX será movido futuramente para um service.
       * Aqui deixamos apenas o mínimo necessário.
       */

      const { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak } = await import("docx");

      const docChildren: any[] = [];

      const pushParagraphs = (text: string) => {
        text.split("\n")
          .filter(t => t.trim() !== "")
          .forEach(t => {
            docChildren.push(
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                children: [new TextRun(t)],
              })
            );
          });
      };

      for (const part of bookParts) {
        if (!part?.content) continue;

        let parsed = null;
        try { parsed = JSON.parse(part.content); } catch { parsed = { content: part.content }; }

        if (part.part_type === "cover") {
          docChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: parsed.title || book.title, bold: true, size: 60 })],
          }));
          docChildren.push(new Paragraph({ children: [new PageBreak()] }));
          continue;
        }

        if (parsed?.title) {
          docChildren.push(new Paragraph({
            children: [new TextRun({ text: parsed.title, bold: true, size: 40 })],
          }));
        }

        if (parsed?.content) pushParagraphs(parsed.content);

        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
      }

      const document = new Document({
        sections: [{ children: docChildren }],
      });

      const blob = await Packer.toBlob(document);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${book.title.replace(/ /g, "_")}.docx`;
      a.click();

      updateLog("✔ DOCX gerado com sucesso!");
    } catch (err: any) {
      updateLog("❌ ERRO ao gerar DOCX: " + err.message);
      alert(err.message);
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  /* === COLE A PARTE 3 AQUI === */
  /* ======================================================================= */
  /* ======================= RENDERIZAÇÃO DO COMPONENTE ==================== */
  /* ======================================================================= */

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <Button
            onClick={() => onNavigate("dashboard")}
            variant="secondary"
            className="inline-flex items-center w-full sm:w-auto"
          >
            <ArrowLeftIcon />
            Voltar
          </Button>

          <div className="text-sm text-gray-600">
            A edição foi desativada nesta versão para garantir estabilidade da geração de PDF.
          </div>
        </header>

        {/* ERRO GLOBAL */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            <strong className="font-bold">Erro:</strong>
            <span className="ml-2">{error}</span>
          </div>
        )}

        {/* TÍTULOS */}
        <div className="lg:col-span-2 text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">{book.title}</h1>
          <h2 className="text-xl text-gray-600 mt-1">{book.subtitle}</h2>
          <p className="text-sm text-gray-500 mt-1">por {book.author}</p>
        </div>

        {/* CARD DE AÇÕES */}
        <Card className="lg:col-span-2 text-center mb-10">
          <h3 className="text-xl font-bold text-gray-800">Gerar Arquivos Finais</h3>
          <p className="text-gray-600 mt-2">Escolha o formato desejado:</p>

          <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
            
            {/* PDF FINAL */}
            <Button
              onClick={handleGeneratePdf}
              className="text-lg w-full sm:w-auto"
              isLoading={isGenerating || isLoadingParts}
              loadingText={isLoadingParts ? "Carregando..." : "Gerando PDF..."}
              disabled={isLoadingParts || !!error || isGenerating || isGeneratingDocx || isTestingBackend}
            >
              <GenerateIcon />
              Gerar PDF Final
            </Button>

            {/* DOCX */}
            <Button
              onClick={handleGenerateDocx}
              variant="secondary"
              className="text-lg w-full sm:w-auto"
              isLoading={isGeneratingDocx}
              loadingText="Gerando DOCX..."
              disabled={isLoadingParts || !!error || isGenerating || isGeneratingDocx || isTestingBackend}
            >
              <DocxIcon />
              Baixar .DOCX
            </Button>

            {/* TESTAR BACKEND */}
            <Button
              onClick={handleTestBackendPdf}
              variant="secondary"
              className="text-lg w-full sm:w-auto"
              isLoading={isTestingBackend}
              loadingText="Testando..."
              disabled={isLoadingParts || !!error || isGenerating || isGeneratingDocx || isTestingBackend}
            >
              Testar PDF Backend
            </Button>
          </div>
        </Card>

        {/* LOG */}
        <div className="lg:col-span-2 mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Log de Geração</h2>
          <div
            ref={logContainerRef}
            className="bg-gray-900 text-white font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto"
          >
            {log.length === 0 && (
              <p className="text-gray-400">Aguardando início da geração...</p>
            )}
            {log.map((entry, i) => (
              <p key={i}>{entry}</p>
            ))}
          </div>
        </div>

        {/* PRÉ-VISUALIZAÇÃO */}
        <div className="lg:col-span-2 mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Pré-visualização</h2>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {isLoadingParts ? (
              <div className="h-[80vh] flex justify-center items-center">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="h-[80vh] flex justify-center items-center text-red-600 p-4">
                {error}
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                srcDoc={fullHtml || ""}
                title={book.title}
                className="w-full h-[80vh] border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

/* === COLE A PARTE 4 AQUI === */
/* ======================================================================= */
/* ============================ FINAL DO ARQUIVO ========================= */
/* ======================================================================= */

}; // ← Fecha o componente ViewBookPage

export default ViewBookPage;
