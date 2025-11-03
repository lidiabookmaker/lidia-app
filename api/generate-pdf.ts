// api/generate-pdf.ts

// A sucessora do 'chrome-aws-lambda'. É mais moderna e otimizada.
// Presume-se que '@sparticuz/chromium' e 'puppeteer-core' estão nas dependências.
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { supabase } from '../services/supabase';

// Helper para Vercel não reclamar do tamanho do executável.
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

// Esta é a função que a Vercel irá executar.
export default async function handler(req, res) {
  // 1. Validar a Requisição
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { htmlContent, title } = req.body;
  if (!htmlContent || !title) {
    return res.status(400).json({ error: '`htmlContent` e `title` são obrigatórios.' });
  }

  let browser = null;

  try {
    // 2. Iniciar o Navegador (Chromium)
    // Usamos a versão otimizada para ambientes serverless.
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // 3. Gerar o PDF
    // Carregamos o HTML enviado pelo frontend. `waitUntil: 'networkidle0'`
    // espera todas as conexões de rede (como fontes do Google Fonts) terminarem.
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A5',
      printBackground: true,
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
    });

    // 4. Salvar no Supabase Storage
    const safeTitle = title.replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').toLowerCase();
    const fileName = `${safeTitle}-${Date.now()}.pdf`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('ebooks') // Nome do seu "bucket"
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      // Se o erro for de "duplicate", podemos ignorar ou tratar, mas por agora, lançamos o erro.
      console.error('Supabase Upload Error:', uploadError);
      throw new Error(`Erro ao salvar o PDF no storage: ${uploadError.message}`);
    }

    // 5. Obter a URL Pública e Retornar
    const { data } = supabase.storage
      .from('ebooks')
      .getPublicUrl(filePath);

    if (!data || !data.publicUrl) {
      throw new Error('Não foi possível obter a URL pública do PDF gerado.');
    }

    return res.status(200).json({ downloadUrl: data.publicUrl });

  } catch (error) {
    console.error('Erro na função generate-pdf:', error);
    const err = error as Error;
    // Retornamos um erro claro para o frontend.
    return res.status(500).json({ error: 'Falha ao gerar o PDF.', details: err.message });

  } finally {
    // 6. Garantir que o Navegador Seja Fechado
    // Isso é MUITO importante para não deixar processos abertos na função serverless.
    if (browser !== null) {
      await browser.close();
    }
  }
}
