// api/generate-pdf.ts
// This is a Supabase Edge Function responsible for merging individual PDF parts into a final document.

// FIX: Declare the Deno global to satisfy TypeScript in a non-Deno environment.
// This is needed as Supabase Edge Functions use the Deno runtime.
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'

console.log('Function "generate-pdf" initializing...');

// The interface for book parts, matching the database schema
interface BookPart {
  part_index: number;
  pdf_url: string;
}

Deno.serve(async (req: Request) => {
  console.log(`Received request: ${req.method} ${req.url}`);

  // Explicitly handle preflight requests with detailed headers
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request...');
    return new Response('ok', {
      status: 200, // Explicitly set OK status
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // Define CORS headers for the main response
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    console.log('Processing POST request...');
    const { bookId } = await req.json();
    if (!bookId) {
      throw new Error("Missing 'bookId' in request body.");
    }
    console.log(`Processing bookId: ${bookId}`);

    // Use the admin client to bypass RLS for server-side operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 1. Fetch all part URLs for the given book, ordered correctly
    console.log(`Fetching parts for bookId: ${bookId}`);
    const { data: parts, error: partsError } = await supabaseAdmin
      .from('book_parts')
      .select('part_index, pdf_url')
      .eq('book_id', bookId)
      .order('part_index', { ascending: true })
      .returns<BookPart[]>();

    if (partsError) throw partsError;
    if (!parts || parts.length === 0 || parts.some(p => !p.pdf_url)) {
      throw new Error('Some book parts are missing their PDF URLs or no parts were found.');
    }
    console.log(`Found ${parts.length} parts to merge.`);

    // 2. Create a new PDF document to merge into
    const mergedPdf = await PDFDocument.create();

    // 3. Download and merge each part's PDF
    for (const part of parts) {
      console.log(`Downloading part ${part.part_index}: ${part.pdf_url}`);
      const { data: pdfBlob, error: downloadError } = await supabaseAdmin
        .storage
        .from('books')
        .download(part.pdf_url);

      if (downloadError) throw downloadError;
      if (!pdfBlob) throw new Error(`Failed to download part ${part.part_index}`);

      const pdfBytes = await pdfBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
      console.log(`Merged part ${part.part_index}.`);
    }

    // 4. Save the merged PDF bytes
    const mergedPdfBytes = await mergedPdf.save();
    console.log('PDF merging complete.');

    // 5. Upload the final PDF to storage
    const finalPdfPath = `${bookId}/final/final.pdf`;
    console.log(`Uploading final PDF to: ${finalPdfPath}`);
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('books')
      .upload(finalPdfPath, mergedPdfBytes, { 
        contentType: 'application/pdf', 
        upsert: true 
      });
    
    if (uploadError) throw uploadError;

    // 6. Update the book's status and final URL path
    console.log(`Updating book status to 'ready'.`);
    const { error: updateError } = await supabaseAdmin
      .from('books')
      .update({ status: 'ready', pdf_final_url: finalPdfPath })
      .eq('id', bookId);
      
    if (updateError) throw updateError;
    
    console.log(`Successfully processed bookId: ${bookId}`);
    return new Response(JSON.stringify({ success: true, finalPath: finalPdfPath }), {
      headers: corsHeaders,
      status: 200,
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});