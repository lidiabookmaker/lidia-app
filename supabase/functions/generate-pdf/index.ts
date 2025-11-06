// supabase/functions/generate-pdf/index.ts
// Supabase Edge Function para juntar partes de PDF em um documento final.

declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

console.log('Function "generate-pdf" initializing...');

// Define os cabeçalhos CORS para todas as respostas.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// A interface para as partes do livro, correspondendo ao esquema do banco de dados.
interface BookPart {
  part_index: number;
  pdf_url: string;
}

Deno.serve(async (req: Request) => {
  // Trata a requisição preflight OPTIONS, essencial para o CORS funcionar.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Verificação CRUCIAL para garantir que os segredos da função foram configurados no painel do Supabase.
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('ERRO CRÍTICO: Os segredos da função (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) não estão definidos.');
      throw new Error('A configuração do servidor está incompleta. As variáveis de ambiente da função não foram definidas.');
    }

    const { bookId } = await req.json();
    if (!bookId) {
      throw new Error("O 'bookId' é obrigatório no corpo da requisição.");
    }
    console.log(`Iniciando processo para o bookId: ${bookId}`);

    // Usa o cliente de admin para contornar as políticas de RLS para operações no lado do servidor.
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { persistSession: false } }
    );

    // Fetch book title along with parts
    const { data: bookData, error: bookError } = await supabaseAdmin
      .from('books')
      .select('title')
      .eq('id', bookId)
      .single();

    if (bookError) throw new Error(`Não foi possível encontrar o livro com ID ${bookId}: ${bookError.message}`);
    const bookTitle = bookData.title;

    // 1. Busca os URLs de todas as partes do livro, na ordem correta.
    const { data: parts, error: partsError } = await supabaseAdmin
      .from('book_parts')
      .select('part_index, pdf_url')
      .eq('book_id', bookId)
      .order('part_index', { ascending: true })
      .returns<BookPart[]>();

    if (partsError) throw partsError;
    if (!parts || parts.length === 0 || parts.some(p => !p.pdf_url)) {
      throw new Error('Algumas partes do livro não possuem URLs de PDF ou nenhuma parte foi encontrada.');
    }
    console.log(`Encontradas ${parts.length} partes para juntar.`);

    // 2. Cria um novo documento PDF para juntar todas as partes.
    const mergedPdf = await PDFDocument.create();

    // 3. Baixa e junta o PDF de cada parte.
    for (const part of parts) {
      console.log(`Baixando parte ${part.part_index}: ${part.pdf_url}`);
      const { data: pdfBlob, error: downloadError } = await supabaseAdmin
        .storage
        .from('books')
        .download(part.pdf_url);

      if (downloadError) throw downloadError;
      if (!pdfBlob) throw new Error(`Falha ao baixar a parte ${part.part_index}`);

      const pdfBytes = await pdfBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
      console.log(`Parte ${part.part_index} juntada.`);
    }

    // 4. Adicionar cabeçalhos e rodapés
    console.log('Adicionando cabeçalhos e rodapés...');
    const pageCount = mergedPdf.getPageCount();
    const sansFont = await mergedPdf.embedFont(StandardFonts.Helvetica);
    const serifBoldFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
    const royalBlue = rgb(0/255, 35/255, 102/255); // #002366

    for (let i = 0; i < pageCount; i++) {
        // Pula a primeira página (capa)
        if (i === 0) continue;

        const page = mergedPdf.getPages()[i];
        const { width, height } = page.getSize();

        // Adiciona cabeçalho (título do livro)
        page.drawText(bookTitle.toUpperCase(), {
            x: width / 2,
            y: height - 40, // Aproximadamente no meio da margem superior de 2.3cm
            font: sansFont,
            size: 8,
            color: royalBlue,
            // A biblioteca pdf-lib não tem uma propriedade 'align', o alinhamento é feito no 'x'
            // Para centralizar, calculamos a largura do texto, mas para um título curto, x: width/2 é suficiente.
        });

        // Adiciona rodapé (número da página)
        page.drawText(String(i + 1), {
            x: width / 2,
            y: 40, // Aproximadamente no meio da margem inferior de 2.7cm
            font: serifBoldFont,
            size: 16,
            color: rgb(0, 0, 0),
            opacity: 0.4,
        });
    }
    console.log('Cabeçalhos e rodapés adicionados.');


    // 5. Salva os bytes do PDF finalizado.
    const mergedPdfBytes = await mergedPdf.save();
    console.log('Junção de PDFs completa.');

    // 6. Envia o PDF final para o Storage.
    const finalPdfPath = `${bookId}/final/final.pdf`;
    console.log(`Enviando PDF final para: ${finalPdfPath}`);
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('books')
      .upload(finalPdfPath, mergedPdfBytes, { 
        contentType: 'application/pdf', 
        upsert: true 
      });
    
    if (uploadError) throw uploadError;

    // 7. Atualiza o status do livro e a URL do PDF final.
    console.log(`Atualizando status do livro para 'pronto'.`);
    const { error: updateError } = await supabaseAdmin
      .from('books')
      .update({ status: 'ready', pdf_final_url: finalPdfPath })
      .eq('id', bookId);
      
    if (updateError) throw updateError;
    
    console.log(`Processo concluído com sucesso para o bookId: ${bookId}`);
    return new Response(JSON.stringify({ success: true, finalPath: finalPdfPath }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na função generate-pdf:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});