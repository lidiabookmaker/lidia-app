// supabase/functions/generate-pdf/index.ts
//
// =================================================================================
// FUNÇÃO OBSOLETA - NÃO MAIS UTILIZADA
// =================================================================================
// A lógica de geração de PDF foi inteiramente movida para o lado do cliente,
// no componente ViewBookPage.tsx. Essa mudança foi necessária para implementar
// a diagramação profissional (camadas de cabeçalho/rodapé e numeração de página)
// usando uma abordagem que é compatível com o ambiente de hospedagem atual.
//
// Este arquivo pode ser removido em futuras limpezas de código.
// =================================================================================

console.log('Function "generate-pdf" is obsolete and should not be called.');

declare const Deno: any;

Deno.serve(async (req: Request) => {
    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
    
    return new Response(JSON.stringify({ error: 'This function is obsolete and no longer in use.' }), {
      status: 410, // 410 Gone
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
});
