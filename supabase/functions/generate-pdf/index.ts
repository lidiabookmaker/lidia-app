// supabase/functions/generate-pdf/index.ts

// FIX: The original triple-slash directive `/// <reference lib="deno.ns" />` was causing type resolution errors
// in the local TypeScript environment. Using `declare const Deno: any;` satisfies the compiler by asserting
// the existence of the Deno global, which is guaranteed to be present in the Supabase Edge Function runtime.
// This resolves all "Cannot find name 'Deno'" errors without changing the runtime logic.
declare const Deno: any;

// Shared CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('Function "generate-pdf" initialized.');

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { html } = await req.json();

    if (!html || typeof html !== 'string') {
      throw new Error('Missing or invalid "html" key in request body');
    }

    const tempId = crypto.randomUUID();
    const inputHtmlPath = `/tmp/book-${tempId}.html`;
    const outputPdfPath = `/tmp/book-${tempId}.pdf`;
    
    try {
      await Deno.writeTextFile(inputHtmlPath, html);

      const command = new Deno.Command("weasyprint", {
        args: [
          '--encoding', 'utf8',
          inputHtmlPath, 
          outputPdfPath
        ],
      });
      const { code, stderr } = await command.output();
      
      if (code !== 0) {
        const errorOutput = new TextDecoder().decode(stderr);
        console.error('WeasyPrint execution failed:', errorOutput);
        throw new Error(`WeasyPrint failed: ${errorOutput}`);
      }

      const pdfBytes = await Deno.readFile(outputPdfPath);
      
      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="book.pdf"',
        },
        status: 200,
      });
    } finally {
      // Clean up temporary files, ignoring errors if they don't exist
      await Deno.remove(inputHtmlPath).catch(() => {});
      await Deno.remove(outputPdfPath).catch(() => {});
    }
  } catch (error) {
    console.error('Error in generate-pdf function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Use 400 for client-side errors like bad input
    });
  }
});