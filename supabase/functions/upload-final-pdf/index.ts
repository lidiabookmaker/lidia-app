// supabase/functions/upload-final-pdf/index.ts

// FIX: Added Deno namespace reference. This directive is essential for the Supabase Edge 
// Function environment to provide correct typings for the Deno global object and its APIs.
/// <reference lib="deno.ns" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

// Standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Deno serverless function
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure the request method is POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client using environment variables for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Parse FormData from the incoming request
    const formData = await req.formData();
    const bookId = formData.get('bookId') as string;
    const pdfFile = formData.get('pdf') as File;

    // Validate that required form fields are present
    if (!bookId || !pdfFile) {
      return new Response(JSON.stringify({ error: 'Missing required fields: bookId or pdf' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const filePath = `${bookId}/final.pdf`;

    // 1. Upload the PDF file to Supabase Storage
    const { error: uploadError } = await supabaseClient.storage
      .from('books')
      .upload(filePath, pdfFile, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite existing file if it exists
      });

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      throw uploadError;
    }

    // 2. Retrieve the public URL for the uploaded file
    const { data: urlData } = supabaseClient.storage
      .from('books')
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error("Could not retrieve public URL for the uploaded file.");
    }
    const publicUrl = urlData.publicUrl;

    // 3. Update the 'pdf_final_url' column in the 'books' table
    const { error: dbError } = await supabaseClient
      .from('books')
      .update({ pdf_final_url: publicUrl })
      .eq('id', bookId);

    if (dbError) {
      console.error('Database Update Error:', dbError);
      // Attempt to remove the uploaded file if the DB update fails to avoid orphaned files
      await supabaseClient.storage.from('books').remove([filePath]);
      throw dbError;
    }

    // 4. Return a successful response with the public URL
    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Generic error handler for any failures in the try block
    console.error('Function execution error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});