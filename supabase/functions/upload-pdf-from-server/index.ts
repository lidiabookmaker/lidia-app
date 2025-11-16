import { createClient } from '@supabase/supabase-js'

// Esta função usa a chave de administrador para ter permissão total
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const { bookId, pdfBase64 } = await req.json();

  const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
  const filePath = `${bookId}.pdf`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('books')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('books')
    .getPublicUrl(filePath);

  return new Response(JSON.stringify({ publicUrl: publicUrlData.publicUrl }), {
    headers: { 'Content-Type': 'application/json' },
  });
});