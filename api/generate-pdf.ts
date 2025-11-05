// api/merge-pdfs.ts (repurposing generate-pdf.ts)
// This is a Supabase Edge Function responsible for merging individual PDF parts into a final document.

// FIX: Declare the Deno global to satisfy TypeScript in a non-Deno environment.
// This is needed as Supabase Edge Functions use the Deno runtime.
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'

// Standard CORS headers for Supabase Edge Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// The interface for book parts, matching the database schema
interface BookPart {
  part_index: number;
  pdf_url: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { bookId } = await req.json()
    if (!bookId) {
      throw new Error("Missing 'bookId' in request body.")
    }

    // Use the admin client to bypass RLS for server-side operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // 1. Fetch all part URLs for the given book, ordered correctly
    const { data: parts, error: partsError } = await supabaseAdmin
      .from('book_parts')
      .select('part_index, pdf_url')
      .eq('book_id', bookId)
      .order('part_index', { ascending: true })
      .returns<BookPart[]>()

    if (partsError) throw partsError
    if (!parts || parts.length === 0 || parts.some(p => !p.pdf_url)) {
      throw new Error('Some book parts are missing their PDF URLs or no parts were found.')
    }

    // 2. Create a new PDF document to merge into
    const mergedPdf = await PDFDocument.create()

    // 3. Download and merge each part's PDF
    for (const part of parts) {
      // The pdf_url from the database is the path in storage
      const { data: pdfBlob, error: downloadError } = await supabaseAdmin
        .storage
        .from('books')
        .download(part.pdf_url)

      if (downloadError) throw downloadError
      if (!pdfBlob) throw new Error(`Failed to download part ${part.part_index}`)

      const pdfBytes = await pdfBlob.arrayBuffer()
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices())
      copiedPages.forEach((page) => mergedPdf.addPage(page))
    }

    // 4. Save the merged PDF bytes
    const mergedPdfBytes = await mergedPdf.save()

    // 5. Upload the final PDF to storage
    const finalPdfPath = `${bookId}/final/final.pdf`
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('books')
      .upload(finalPdfPath, mergedPdfBytes, { 
        contentType: 'application/pdf', 
        upsert: true 
      })
    
    if (uploadError) throw uploadError

    // 6. Update the book's status and final URL path
    const { error: updateError } = await supabaseAdmin
      .from('books')
      .update({ status: 'ready', pdf_final_url: finalPdfPath })
      .eq('id', bookId)
      
    if (updateError) throw updateError
    
    return new Response(JSON.stringify({ success: true, finalPath: finalPdfPath }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
