// services/pdf-generator.ts

// services/pdf-generator.ts
import { supabase } from "./supabase";
import { assembleFullHtml } from "./bookFormatter";

const WEASYPRINT_URL = "https://print.agenciabrasix.com/pdf";

export async function generateFullPdf(bookId: string): Promise<string> {
  console.log("🔵 [PDF] Iniciando para bookId:", bookId);
  
  const { data: book, error: bookError } = await supabase.from("books").select("*").eq("id", bookId).single();
  if (bookError || !book) throw new Error("Erro ao buscar livro.");

  const { data: parts, error: partsError } = await supabase.from("book_parts").select("*").eq("book_id", bookId).order("part_index");
  if (partsError || !parts) throw new Error("Erro ao buscar partes.");

  const html = assembleFullHtml(book, parts);
  console.log("🔵 [PDF] HTML montado, enviando para WeasyPrint...");

  const response = await fetch(WEASYPRINT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html }),
  });
  if (!response.ok) throw new Error("Falha no servidor WeasyPrint.");

  const pdfBuffer = await response.arrayBuffer();
  const pdfBase64 = btoa(new Uint8Array(pdfBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
  
  console.log("🔵 [PDF] PDF recebido, enviando para a Edge Function de upload...");

  // CHAMA A NOVA FUNÇÃO SEGURA
  const { data: uploadData, error: invokeError } = await supabase.functions.invoke('upload-pdf-from-server', {
    body: { bookId, pdfBase64 },
  });

  if (invokeError) throw invokeError;
  
  const publicUrl = uploadData.publicUrl;
  console.log("🔵 [PDF] Upload concluído! URL:", publicUrl);

  await supabase.from("books").update({ status: "pdf_ready", pdf_url: publicUrl }).eq("id", bookId);
  console.log("✅ [PDF] Geração finalizada com sucesso!");

  return publicUrl;
}



/*
import { supabase } from "./supabase";
import { assembleFullHtml } from "./bookFormatter";

const WEASYPRINT_URL = "https://print.agenciabrasix.com/pdf";

/**
 * Gera o PDF completo de um livro e salva no Supabase Storage.
 * @param bookId ID do livro no banco
 */


/*
export async function generateFullPdf(bookId: string): Promise<string> {
  console.log("🔵 [PDF] Iniciando geração do PDF para bookId:", bookId);

  // 1 — Buscar dados do livro
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();

  if (bookError || !book) {
    console.error("❌ Erro ao buscar livro:", bookError);
    throw new Error("Erro ao buscar o livro no Supabase.");
  }

  // 2 — Buscar todas as partes
  const { data: parts, error: partsError } = await supabase
    .from("book_parts")
    .select("*")
    .eq("book_id", bookId)
    .order("part_index", { ascending: true });

  if (partsError || !parts || parts.length === 0) {
    console.error("❌ Erro ao buscar partes:", partsError);
    throw new Error("Erro ao buscar partes do livro.");
  }

  console.log("🔵 [PDF] Partes carregadas:", parts.length);

  // 3 — Montar o HTML completo
  const html = assembleFullHtml(book, parts);

  console.log("🔵 [PDF] HTML final montado (" + html.length + " chars)");

  // 4 — Enviar HTML para o servidor WeasyPrint
  console.log("🔵 [PDF] Enviando para o servidor WeasyPrint…");

  const response = await fetch(WEASYPRINT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ html }),
  });

  if (!response.ok) {
    console.error("❌ Erro do servidor WeasyPrint:", await response.text());
    throw new Error("Falha ao gerar PDF no servidor WeasyPrint.");
  }

// ...
const pdfBuffer = await response.arrayBuffer(); // <--- MUDANÇA 1: Voltamos para ArrayBuffer
const pdfUint8Array = new Uint8Array(pdfBuffer); // <--- MUDANÇA 2: Convertemos para o formato de bytes

console.log("🔵 [PDF] PDF recebido:", pdfUint8Array.length, "bytes");

// 5 — Upload para o Supabase Storage
const filePath = `${bookId}.pdf`;

console.log("🔵 [PDF] Salvando PDF no Supabase Storage:", filePath);

const { error: uploadError } = await supabase.storage
    .from("books")
    .upload(filePath, pdfUint8Array, { // <--- MUDANÇA 3: Enviamos os bytes
        contentType: "application/pdf",
        upsert: true,
    });
// ...



  if (uploadError) {
    console.error("❌ Erro ao fazer upload do PDF:", uploadError);
    throw new Error("Erro ao salvar PDF no Storage.");
  }

  // 6 — Obter URL pública
  const { data: publicUrlData } = supabase.storage
    .from("books")
    .getPublicUrl(filePath);

  const publicUrl = publicUrlData.publicUrl;

  console.log("🔵 [PDF] PDF disponível em:", publicUrl);

  // 7 — Atualizar status do livro
  await supabase
    .from("books")
    .update({ status: "pdf_ready", pdf_url: publicUrl })
    .eq("id", bookId);

  console.log("✅ [PDF] Geração finalizada com sucesso!");

  return publicUrl;
}
*/
