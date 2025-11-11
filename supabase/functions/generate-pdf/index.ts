// supabase/functions/generate-pdf/index.ts
// FIX: Use a triple-slash lib reference to make Deno's native types available to TypeScript.
// This resolves "Cannot find name 'Deno'" errors and is the modern way to handle this.
/// <reference lib="deno.ns" />

// Using the modern, built-in Deno.serve instead of the deprecated `serve` from std/http.

// Shared CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('Starting "generate-pdf" backend function with WeasyPrint integration...');

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure the request is a POST request
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the HTML content from the request body
    const { html } = await req.json();

    if (!html || typeof html !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid "html" key in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Define paths for temporary files
    const inputHtmlPath = '/tmp/book.html';
    const outputPdfPath = '/tmp/book.pdf';
    
    try {
      // 1. Save the received HTML to a temporary file on the server.
      await Deno.writeTextFile(inputHtmlPath, html);
      console.log(`HTML content successfully saved to ${inputHtmlPath}`);

      // 2. Execute the WeasyPrint command to convert HTML to PDF.
      console.log(`Executing WeasyPrint: weasyprint ${inputHtmlPath} ${outputPdfPath}`);
      const command = new Deno.Command("weasyprint", {
        args: [inputHtmlPath, outputPdfPath],
      });
      const { code, stderr } = await command.output();
      
      console.log("WeasyPrint command finished execution.");

      // Check if the command failed.
      if (code !== 0) {
        const errorOutput = new TextDecoder().decode(stderr);
        console.error('WeasyPrint execution failed:', errorOutput);
        throw new Error(`WeasyPrint failed: ${errorOutput}`);
      }

      console.log('WeasyPrint command ran successfully.');

      // 3. Read the generated PDF file from the filesystem.
      const pdfBytes = await Deno.readFile(outputPdfPath);
      console.log(`Generated PDF file read successfully (${pdfBytes.length} bytes).`);
      
      // 4. Return the PDF file in the response.
      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="book.pdf"',
        },
        status: 200,
      });
    } catch (weasyPrintError) {
      console.error('Error during WeasyPrint pipeline:', weasyPrintError);
      // If conversion fails, return a JSON error response.
      return new Response(
        JSON.stringify({ status: 'error', message: weasyPrintError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    } finally {
      // Clean up the temporary files regardless of success or failure.
      try {
        await Deno.remove(inputHtmlPath);
        await Deno.remove(outputPdfPath);
      } catch (cleanupError) {
        // Log if cleanup fails, but don't let it crash the main function response.
        console.warn('Could not clean up temporary files:', cleanupError.message);
      }
    }
  } catch (error) {
    console.error('Error in generate-pdf function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
