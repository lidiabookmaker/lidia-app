// Backup da função antiga de merge de PDFs
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';

console.log('Function "generate-pdf" initializing...');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('ERRO: Variáveis SUPABASE_URL ou SERVICE ROLE não definidas.');
      throw new Error('Configuração do servidor incompleta.');
    }

    const { bookId } = await req.json();
    if (!bookId) throw new Error("O 'bookId' é obrigatório.");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: parts, error: partsError } = await supabaseAdmin
      .from('book_parts')
      .select('part_index, pdf_url')
      .eq('book_id', bookId)
      .order('part_index', { ascending: true });

    if (partsError) throw partsError;
    if (!parts || parts.length === 0 || parts.some(p => !p.pdf_url)) {
      throw new Error('Partes do livro faltando URLs de PDF.');
    }

    const mergedPdf = await PDFDocument.create();

    for (const part of parts) {
      const { data: file, error } = await supabaseAdmin.storage.from('books').download(part.pdf_url);
      if (error) throw error;

      const pdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach(p => mergedPdf.addPage(p));
    }

    const finalPdfBytes = await mergedPdf.save();
    const finalPath = `${bookId}/final/final.pdf`;

    await supabaseAdmin.storage.from('books').upload(finalPath, finalPdfBytes, {
      contentType: 'application/pdf',
      upsert: true
    });

    await supabaseAdmin.from('books').update({
      status: 'ready',
      pdf_final_url: finalPath
    }).eq('id', bookId);

    return new Response(JSON.stringify({ success: true, finalPath }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro na função generate-pdf:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
});
