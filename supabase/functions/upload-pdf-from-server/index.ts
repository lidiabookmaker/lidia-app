// supabase/functions/upload-pdf-from-server/index.ts

import { createClient } from '@supabase/supabase-js'

// Estes são os cabeçalhos de permissão (CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Permite qualquer origem, para simplificar. Podemos restringir depois.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// A função principal agora usa a chave de administrador
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  // Este bloco lida com a "pergunta de permissão" (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { bookId, pdfBase64 } = await req.json();
    if (!bookId || !pdfBase64) {
      throw new Error('bookId e pdfBase64 são obrigatórios.');
    }

    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const filePath = `${bookId}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('books')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro no upload para o Storage:', uploadError);
      throw uploadError;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('books')
      .getPublicUrl(filePath);

    return new Response(JSON.stringify({ publicUrl: publicUrlData.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});