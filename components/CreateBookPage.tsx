import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { UserProfile, Book, BookGenerationFormData, Page } from '../types';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';
import { Card } from './ui/Card';
import { GEMINI_API_KEY } from '../services/geminiConfig';

// --- Tipos para a nova estrutura do livro ---
interface SubChapter {
  title: string;
  content: string;
}
interface Chapter {
  title: string;
  introduction: string;
  subchapters: SubChapter[];
}
interface DetailedBookContent {
  optimized_title: string;
  introduction: { title: string; content: string };
  table_of_contents: { title: string; content: string; };
  chapters: Chapter[];
  conclusion: { title: string; content: string };
}
// --- Fim dos Tipos ---

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

interface CreateBookPageProps {
  user: UserProfile;
  onBookCreated: (newBookData: Omit<Book, 'id' | 'created_at'>, updatedCredits: number) => Promise<void>;
  onNavigate: (page: Page) => void;
  onBeforeGenerate: () => Promise<{ allow: boolean; message: string }>;
}

export const CreateBookPage: React.FC<CreateBookPageProps> = ({ user, onBookCreated, onNavigate, onBeforeGenerate }) => {
  const [formData, setFormData] = useState<BookGenerationFormData>({
    title: '',
    subtitle: '',
    author: user.email?.split('@')[0] || 'Autor',
    language: 'Português (Brasil)',
    tone: 'Inspirador e prático',
    niche: 'Desenvolvimento Pessoal',
    summary: '',
  });
  const [log, setLog] = useState<string[]>([]);
  const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const formatContentForHTML = (text: string, addIndent = true) => {
    return text.split('\n').filter(p => p.trim() !== '').map(p => `<p class="font-merriweather ${addIndent ? 'indent' : ''}">${p}</p>`).join('');
  }

  const generateBookHTML = (bookData: BookGenerationFormData, bookContent: DetailedBookContent): string => {
    const year = new Date().getFullYear();
    const pageBgColor = '#FFFFFF'; // Fundo branco conforme solicitado
    
    const styles = `
      <style>
          @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Merriweather:wght@400;700&family=Merriweather+Sans:wght@300;400;600;700&display=swap');
          
          body {
              font-family: 'Merriweather', serif;
              font-size: 11pt;
              color: #262626;
              margin: 0;
              background-color: #f0f0f0;
          }
          .page-container {
               width: 14.8cm;
               min-height: 21cm;
               margin: 1cm auto;
               padding: 2cm;
               background: ${pageBgColor};
               box-shadow: 0 0 10px rgba(0,0,0,0.1);
               box-sizing: border-box;
               page-break-after: always;
           }
          
          /* --- Cover Page (CSS Version) --- */
          .cover-page {
              padding: 0;
              text-align: center;
              height: 21cm;
              width: 14.8cm;
              margin: 1cm auto;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
              box-sizing: border-box;
              position: relative;
              overflow: hidden;
              background: linear-gradient(to bottom right, rgba(255, 245, 225, 0.1) 0%, rgba(10, 207, 131, 0.1) 100%);
          }
          .cover-page .content-wrapper {
              position: relative;
              z-index: 10;
              height: 100%;
              width: 100%;
          }
          .cover-page .title, .cover-page .subtitle, .cover-page .author {
              position: absolute;
              left: 50%;
              transform: translateX(-50%);
              width: 90%;
              padding: 0 1cm;
              box-sizing: border-box;
          }
          .cover-page .title {
              font-family: 'League Gothic', sans-serif;
              font-size: 4.5rem;
              text-transform: uppercase;
              margin: 0;
              line-height: 1.1;
              color: #0d47a1;
              top: 30mm;
          }
          .cover-page .subtitle {
              font-family: 'Merriweather Sans', sans-serif;
              font-size: 1.125rem;
              margin: 0;
              color: #212121;
              font-style: italic;
              top: 100mm;
          }
          .cover-page .author {
              font-family: 'Merriweather Sans', sans-serif;
              font-size: 1rem;
              font-weight: 400;
              margin: 0;
              color: #212121;
              top: 140mm;
          }
          .onda {
            position: absolute;
            top: 155mm;
            width: 200%;
            height: 100mm;
            left: -50%;
            border-radius: 45%;
            z-index: 1;
          }
          .onda1 {
            background: linear-gradient(90deg, #0052A5 0%, #0ACF83 100%);
            transform: rotate(-8deg);
            animation: wave1 15s ease-in-out infinite alternate;
          }
          .onda2 {
            background: linear-gradient(90deg, #0ACF83 0%, #0052A5 100%);
            opacity: 0.75;
            transform: rotate(-5deg);
            animation: wave2 12s ease-in-out infinite alternate;
          }
          .onda3 {
            background: linear-gradient(90deg, #0077FF 0%, #00FFB3 100%);
            opacity: 0.5;
            transform: rotate(-2deg);
            animation: wave3 10s ease-in-out infinite alternate;
          }

          @keyframes wave1 {
            from { transform: rotate(-8deg) translateX(-20px); }
            to { transform: rotate(-10deg) translateX(20px); }
          }
          @keyframes wave2 {
            from { transform: rotate(-5deg) translateX(-10px); }
            to { transform: rotate(-3deg) translateX(10px); }
          }
          @keyframes wave3 {
            from { transform: rotate(-2deg); }
            to { transform: rotate(0deg); }
          }

          /* --- Copyright Page --- */
          .copyright-page {
              display: flex;
              flex-direction: column;
              justify-content: flex-end;
          }
          .copyright-page .content {
              text-align: center;
              font-family: 'Merriweather Sans', sans-serif;
              font-size: 8pt;
              color: #595959;
          }

          /* --- Content Pages --- */
          .content-page h1.font-merriweather {
              font-family: 'Merriweather', serif;
              font-weight: 700;
              font-size: 24pt;
              margin-bottom: 24pt;
              color: #333;
              text-align: left;
          }
          .content-page h2.font-merriweather {
              font-family: 'Merriweather', serif;
              font-weight: 700;
              font-size: 18pt;
              margin-top: 18pt;
              margin-bottom: 12pt;
              color: #333;
          }
          .content-page h3.font-merriweather-sans {
              font-family: 'Merriweather Sans', sans-serif;
              font-weight: 700;
              font-size: 14pt;
              margin-top: 14pt;
              margin-bottom: 8pt;
              color: #444;
          }
          .content-page p.font-merriweather {
              line-height: 1.6;
              margin-bottom: 11pt;
              text-align: justify;
          }
          .content-page p.indent {
              text-indent: 1.5em;
          }
          .toc-item {
              font-family: 'Merriweather Sans', sans-serif;
              margin-bottom: 4pt;
          }
          .toc-chapter {
              font-weight: 700;
              margin-top: 8pt;
          }
          .toc-subchapter {
              margin-left: 20px;
          }

          /* --- Chapter Title Page --- */
          .chapter-title-page {
              display: flex;
              justify-content: center;
              align-items: center;
              text-align: center;
          }
           .chapter-title-standalone {
              font-family: 'Merriweather', serif;
              font-size: 24pt;
           }
      </style>
    `;

    const coverPage = `
        <div class="cover-page" data-page="cover">
            <div class="content-wrapper">
                <h1 class="title">${bookData.title}</h1>
                <p class="subtitle">${bookData.subtitle}</p>
                <p class="author">${bookData.author}</p>
            </div>
            <div class="onda onda1"></div>
            <div class="onda onda2"></div>
            <div class="onda onda3"></div>
        </div>`;
    
    const copyrightPage = `
        <div class="page-container copyright-page" data-page="copyright">
            <div class="content">
                <p>Copyright © ${year} ${bookData.author}</p>
                <p>Todos os direitos reservados.</p>
                <p>Este livro ou qualquer parte dele não pode ser reproduzido ou usado de forma alguma sem a permissão expressa por escrito do editor, exceto pelo uso de breves citações em uma resenha do livro.</p>
            </div>
        </div>`;

    const contentStart = `<div data-page="content-start">`;
    const contentEnd = `</div>`;

    let mainContent = '';
    
    // Table of Contents
    mainContent += `<div class="page-container content-page">`;
    mainContent += `<h1 class="font-merriweather">${bookContent.table_of_contents.title}</h1>`;
    mainContent += bookContent.table_of_contents.content.split('\n').map(line => {
        line = line.trim();
        if (!line) return '';
        if (line.match(/^capítulo \d+:/i)) {
            return `<p class="toc-item toc-chapter">${line}</p>`;
        }
        return `<p class="toc-item toc-subchapter">${line}</p>`;
    }).join('');
    mainContent += `</div>`;
    
    // Introduction
    mainContent += `<div class="page-container content-page">`;
    mainContent += `<h1 class="font-merriweather">${bookContent.introduction.title}</h1>`;
    mainContent += formatContentForHTML(bookContent.introduction.content);
    mainContent += `</div>`;

    // Chapters
    bookContent.chapters.forEach(chapter => {
      mainContent += `<div class="page-container chapter-title-page" data-page="title-chapter-${chapter.title.replace(/\s/g, '_')}">
                        <h1 class="chapter-title-standalone">${chapter.title}</h1>
                      </div>`;
      mainContent += `<div class="page-container content-page">`;
      mainContent += `<h2 class="font-merriweather">${chapter.title}</h2>`;
      mainContent += formatContentForHTML(chapter.introduction, false);
      chapter.subchapters.forEach(subchapter => {
        mainContent += `<h3 class="font-merriweather-sans">${subchapter.title}</h3>`;
        mainContent += formatContentForHTML(subchapter.content);
      });
      mainContent += `</div>`;
    });

    // Conclusion
    mainContent += `<div class="page-container content-page">`;
    mainContent += `<h1 class="font-merriweather">${bookContent.conclusion.title}</h1>`;
    mainContent += formatContentForHTML(bookContent.conclusion.content);
    mainContent += `</div>`;

    return `<html><head><title>${bookData.title}</title>${styles}</head><body>${coverPage}${copyrightPage}${contentStart}${mainContent}${contentEnd}</body></html>`;
  };

  const handleGenerateBook = async () => {
    const { allow, message } = await onBeforeGenerate();
    if (!allow) {
        setErrorMessage(message);
        setGenerationState('error');
        return;
    }

    setLog([]);
    setErrorMessage('');
    setGeneratedHtml(null);
    setGenerationState('generating');

    try {
      updateLog("Inicializando o cliente da API do Gemini...");
      const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

      const bookSchema = {
          type: Type.OBJECT,
          properties: {
              optimized_title: { type: Type.STRING, description: "O título final otimizado para a capa, com no máximo 45 caracteres." },
              introduction: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } }, required: ['title', 'content'] },
              table_of_contents: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } }, required: ['title', 'content'] },
              chapters: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          title: { type: Type.STRING },
                          introduction: { type: Type.STRING },
                          subchapters: {
                              type: Type.ARRAY,
                              items: {
                                  type: Type.OBJECT,
                                  properties: {
                                      title: { type: Type.STRING },
                                      content: { type: Type.STRING },
                                  },
                                  required: ['title', 'content']
                              }
                          }
                      },
                      required: ['title', 'introduction', 'subchapters']
                  }
              },
              conclusion: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } }, required: ['title', 'content'] },
          },
          required: ['optimized_title', 'introduction', 'table_of_contents', 'chapters', 'conclusion']
      };

      updateLog("Criando prompt para a IA...");
      const prompt = `
        Por favor, crie o conteúdo completo para um livro digital com as seguintes especificações.
        O formato da resposta DEVE ser um JSON válido que corresponda ao esquema fornecido.
        NÃO inclua markdown (como \`\`\`json) na sua resposta. A resposta deve ser APENAS o JSON.

        **Instruções para o Título:**
        - **Sugestão de Título (do usuário):** "${formData.title}"
        - A partir da sugestão do usuário, crie um **Título Final Otimizado** para a capa do livro.
        - **REGRAS OBRIGATÓRIAS para o Título Final Otimizado:**
          - DEVE ter no máximo 45 caracteres no total.
          - DEVE ser impactante e comercialmente atraente.
          - DEVE ser idealmente divisível em 2 ou 3 linhas curtas para um bom design de capa.
        - O campo no JSON de resposta para este título DEVE ser \`optimized_title\`.

        **Outras Informações:**
        **Subtítulo:** ${formData.subtitle}
        **Autor:** ${formData.author}
        **Idioma:** ${formData.language}
        **Tom de voz:** ${formData.tone}
        **Nicho/Assunto:** ${formData.niche}
        **Resumo do conteúdo desejado:** ${formData.summary}
        
        **Estrutura e Contagem de Palavras (siga o mais próximo possível):**
        - **Introdução:** (Aproximadamente 400 palavras). O título DEVE ser "Introdução".
        - **Sumário:** O título DEVE ser "Sumário". O conteúdo deve ser APENAS a lista de todos os 10 capítulos e seus 3 subcapítulos, formatada como texto simples com quebras de linha. Exemplo: 'Capítulo 1: Título do Capítulo\\n- Subcapítulo 1.1\\n- Subcapítulo 1.2'. NÃO inclua nenhum parágrafo de introdução ou texto descritivo para o sumário.
        - **Capítulos:** Crie exatamente 10 capítulos. O total de palavras por capítulo deve ser aproximadamente 2100 palavras.
          - **Introdução do Capítulo:** (Aproximadamente 300 palavras). Uma breve introdução para o capítulo.
          - **Subcapítulos:** Crie exatamente 3 subcapítulos para cada capítulo.
            - **Conteúdo de cada Subcapítulo:** (Aproximadamente 600 palavras). Conteúdo detalhado e bem escrito para cada subcapítulo.
        - **Conclusão:** (Aproximadamente 600 palavras). Um capítulo de conclusão. O título DEVE ser "Conclusão".

        **Instruções Adicionais para Títulos de Capítulo:**
        - Para o título de cada capítulo na estrutura JSON (\`chapters[].title\`), forneça APENAS o nome do capítulo (ex: "Os Pilares da Alimentação Saudável"), sem o prefixo numérico como "Capítulo 1:".

        O conteúdo total do livro deve ter aproximadamente 22.800 palavras.
      `;

      updateLog("Enviando requisição para o modelo Gemini 2.5 Pro...");
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: bookSchema
        }
      });
      updateLog("Resposta recebida da IA.");

      let jsonText = response.text.trim();
      const bookContent: DetailedBookContent = JSON.parse(jsonText);
      updateLog("Conteúdo do livro analisado com sucesso.");
      
      const finalTitle = bookContent.optimized_title;
      updateLog(`Título otimizado pela IA: "${finalTitle}"`);

      updateLog("Formatando o livro em HTML...");
      const finalBookData = { ...formData, title: finalTitle };
      const html = generateBookHTML(finalBookData, bookContent);
      setGeneratedHtml(html);
      updateLog("Formatação HTML concluída.");

      updateLog("Salvando o livro no banco de dados...");
      const newBookData: Omit<Book, 'id' | 'created_at'> = {
          user_id: user.id,
          title: finalTitle,
          subtitle: formData.subtitle,
          author: formData.author,
          content: html
      };
      
      const newCredits = user.book_credits - 1;
      await onBookCreated(newBookData, newCredits);

      updateLog("Livro criado e salvo com sucesso! Você pode visualizá-lo e fazer o download.");
      setGenerationState('success');

    } catch (error) {
        console.error("Erro ao gerar o livro:", error);
        const err = error as Error;
        updateLog(`Falha na geração: ${err.message}`);
        setErrorMessage(`Ocorreu um erro: ${err.message}. Verifique o console para mais detalhes.`);
        setGenerationState('error');
    }
  };

  const handleDownload = async () => {
    if (!generatedHtml) return;
    setIsDownloading(true);
    setErrorMessage('');
    try {
        const response = await fetch('/api/generate-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                htmlContent: generatedHtml,
                title: formData.title || 'livro-digital'
            }),
        });
        
        const responseText = await response.text();

        if (!response.ok) {
            let errorMessage;
            try {
                const errorJson = JSON.parse(responseText);
                errorMessage = errorJson.details || errorJson.error || `O servidor respondeu com status ${response.status}`;
            } catch (e) {
                errorMessage = responseText;
            }
            throw new Error(errorMessage);
        }
        
        const { downloadUrl } = JSON.parse(responseText);
        window.open(downloadUrl, '_blank');

    } catch (error) {
        console.error("PDF Download failed:", error);
        const err = error as Error;
        setErrorMessage(`Ocorreu um erro ao gerar o PDF: ${err.message}`);
    } finally {
        setIsDownloading(false);
    }
  };

  const isFormValid = formData.title && formData.summary && formData.niche;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <Button onClick={() => onNavigate('dashboard')} variant="secondary" className="inline-flex items-center">
            <ArrowLeftIcon />
            Voltar ao Dashboard
          </Button>
        </header>
        <main>
          <Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Coluna do Formulário */}
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Criar Novo Livro</h1>
                <p className="text-gray-600 mb-6">Preencha os detalhes abaixo para a IA gerar seu e-book.</p>
                
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleGenerateBook(); }}>
                  <Input name="title" label="Sugestão de Título *" value={formData.title} onChange={handleInputChange} placeholder="Ex: O Guia Definitivo do Marketing Digital" required />
                  <Input name="subtitle" label="Subtítulo" value={formData.subtitle} onChange={handleInputChange} placeholder="Ex: Estratégias para alavancar seu negócio online" />
                  <Input name="author" label="Autor(es)" value={formData.author} onChange={handleInputChange} required />
                  <TextArea name="summary" label="Resumo do Conteúdo *" value={formData.summary} onChange={handleInputChange} placeholder="Descreva sobre o que é o livro, os principais tópicos que devem ser abordados, e o público-alvo." required rows={6} />
                  <Input name="niche" label="Nicho/Assunto Principal *" value={formData.niche} onChange={handleInputChange} placeholder="Ex: Marketing para pequenas empresas, Culinária vegana, etc." required />
                  <Input name="tone" label="Tom de Voz" value={formData.tone} onChange={handleInputChange} placeholder="Ex: Inspirador e prático, formal e acadêmico, divertido e casual" />
                  <Input name="language" label="Idioma" value={formData.language} onChange={handleInputChange} />
                  <Button 
                    type="submit" 
                    className="w-full text-lg" 
                    isLoading={generationState === 'generating'}
                    loadingText="Gerando seu livro..."
                    disabled={!isFormValid || generationState === 'generating'}
                  >
                    Gerar Livro com IA
                  </Button>
                </form>
              </div>

              {/* Coluna de Status e Resultado */}
              <div className="flex flex-col">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Status da Geração</h2>
                <div ref={logContainerRef} className="bg-gray-900 text-white font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto mb-4 flex-grow">
                  {log.length === 0 && <p className="text-gray-400">Aguardando início da geração...</p>}
                  {log.map((line, index) => <p key={index} className="whitespace-pre-wrap">{line}</p>)}
                </div>

                {generationState === 'error' && (
                  <Card className="border-2 border-red-300 bg-red-50">
                    <h3 className="text-lg font-bold text-red-800">Erro na Geração</h3>
                    <p className="text-red-700 mt-2">{errorMessage}</p>
                  </Card>
                )}
                 {errorMessage && generationState !== 'generating' && (
                  <Card className="border-2 border-red-300 bg-red-50 mt-4">
                    <h3 className="text-lg font-bold text-red-800">Erro no Download</h3>
                    <p className="text-red-700 mt-2">{errorMessage}</p>
                  </Card>
                )}


                {generationState === 'success' && generatedHtml && (
                  <Card className="border-2 border-green-300 bg-green-50">
                    <h3 className="text-lg font-bold text-green-800">Livro Gerado com Sucesso!</h3>
                    <p className="text-green-700 mt-2 mb-4">Seu livro está pronto. Visualize abaixo ou faça o download.</p>
                    <div className="flex space-x-4">
                      <Button onClick={handleDownload} className="w-full" isLoading={isDownloading} loadingText="Preparando PDF...">Baixar em PDF</Button>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            {generationState === 'success' && generatedHtml && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Pré-visualização do Livro</h2>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border">
                   <iframe
                        srcDoc={generatedHtml}
                        title="Pré-visualização do Livro"
                        className="w-full border-0 h-[80vh]"
                        sandbox="allow-same-origin"
                    />
                </div>
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
};
