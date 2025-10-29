import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_API_KEY, isGeminiConfigured } from '../services/geminiConfig';
import { downloadAsPdf } from '../services/pdf-generator';
import type { UserProfile, Book, BookGenerationFormData, Page } from '../types';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';
import { coverBackgroundImage } from '../services/pdf-assets';


interface CreateBookPageProps {
  user: UserProfile;
  onBookCreated: (bookData: Omit<Book, 'id' | 'created_at'>, updatedCredits: number) => Promise<void>;
  onNavigate: (page: Page) => void;
  onBeforeGenerate: () => Promise<{ allow: boolean; message: string }>;
}

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
  introduction: { title: string; content: string };
  table_of_contents: { title: string; content: string; };
  chapters: Chapter[];
  conclusion: { title: string; content: string };
}
// --- Fim dos Tipos ---


const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);


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

  const formatContentForHTML = (text: string) => {
    return text.split('\n').filter(p => p.trim() !== '').map(p => `<p class="font-merriweather">${p}</p>`).join('');
  }

  const generateBookHTML = (bookData: BookGenerationFormData, bookContent: DetailedBookContent): string => {
    const year = new Date().getFullYear();
    
    // NOTE: This function produces a single-flow HTML document suitable for the iframe preview.
    // The PDF generator will now parse this and build the PDF programmatically.
    
    const styles = `
      <style>
          /* Note: @import is used for the iframe preview only */
          @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Merriweather:wght@400;700&family=Merriweather+Sans:wght@300;400;600;700&display=swap');
          
          div, p, h1, h2, h3 {
              box-sizing: border-box;
          }
          body {
              font-family: 'Merriweather', serif;
              font-size: 12pt;
              color: #262626;
              margin: 0;
          }
           .page-container {
               width: 14.8cm;
               min-height: 21cm;
               margin: 2cm auto;
               padding: 2cm;
               background: white;
               box-shadow: 0 0 10px rgba(0,0,0,0.1);
           }
          
          /* --- Cover Page --- */
          .cover-page {
              padding: 2cm;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 21cm; /* A5 height */
              width: 14.8cm; /* A5 width */
              background-image: url('${coverBackgroundImage}');
              background-size: cover;
              background-position: center;
              color: #333;
          }
          .cover-page .title {
              font-family: 'League Gothic', sans-serif;
              font-size: 4.5rem; /* ~72pt */
              text-transform: uppercase;
              margin: 0;
              line-height: 1;
              color: #0d47a1; /* Dark Blue */
          }
          .cover-page .subtitle {
              font-family: 'Merriweather Sans', sans-serif;
              font-size: 1.125rem; /* ~18pt */
              margin: 1.5rem 0;
              color: #212121; /* Dark Gray */
              font-style: italic;
          }
          .cover-page .author {
              font-family: 'Merriweather Sans', sans-serif;
              font-size: 1rem; /* ~16pt */
              font-weight: 400;
              margin-top: 2rem;
              color: #212121; /* Dark Gray */
          }

          /* --- Copyright Page --- */
          .copyright-page {
             display: flex;
             flex-direction: column;
             justify-content: flex-end;
             align-items: center;
          }
          .copyright-page p {
              font-size: 9pt;
              color: #595959;
              text-align: center;
              line-height: 1.5;
          }

          /* --- Chapter Title Page --- */
          .chapter-title-break {
              display: flex;
              justify-content: center;
              align-items: center;
              text-align: center;
          }
          .chapter-title-standalone {
              font-family: 'Merriweather', serif !important;
              font-weight: 300 !important;
              font-size: 24pt !important;
          }

          /* --- General Content Styles --- */
          h1, h2, h3 {
              font-family: 'Merriweather Sans', sans-serif;
              font-weight: 700;
          }
          h1 { font-size: 24pt; margin-bottom: 1cm; }
          h2 { font-size: 18pt; margin-top: 1cm; margin-bottom: 0.5cm; }
          h3 { font-size: 14pt; font-weight: 600; margin-top: 0.8cm; margin-bottom: 0.3cm;}
          p { 
              font-family: 'Merriweather', serif;
              line-height: 1.6; 
              text-align: justify;
              margin-bottom: 0.4cm;
          }
           p:first-of-type {
              text-indent: 1cm;
          }
          .toc-item {
              text-indent: 0;
              margin-bottom: 0.2cm;
          }
           /* Helper classes */
          .font-merriweather { font-family: 'Merriweather', serif; }
      </style>
    `;

    // --- Montagem do HTML ---
    let html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${bookData.title}</title>${styles}</head><body>`;

    // Capa
    html += `<div class="cover-page" data-page="cover"><div><h1 class="title">${bookData.title}</h1><p class="subtitle">${bookData.subtitle}</p><p class="author">${bookData.author}</p></div></div>`;
    
    // Copyright
    html += `<div class="page-container copyright-page" data-page="copyright"><p>Copyright © ${year} ${bookData.author}</p><p>Todos os direitos reservados...</p></div>`;
    
    
    // Conteúdo
    let mainContentHtml = `<div class="page-container" data-page="content-start">`;
    // Sumário
    if(bookContent.table_of_contents) {
        mainContentHtml += `<div class="chapter-title-break" data-page="title-toc"><h1 class="chapter-title-standalone">${bookContent.table_of_contents.title}</h1></div>`;
        mainContentHtml += `<h1 class="font-merriweather">${bookContent.table_of_contents.title}</h1>${formatContentForHTML(bookContent.table_of_contents.content).replace(/<p class="font-merriweather">/g, '<p class="font-merriweather toc-item">')}`;
    }

    // Introdução
    mainContentHtml += `<div class="chapter-title-break" data-page="title-intro"><h1 class="chapter-title-standalone">${bookContent.introduction.title}</h1></div>`;
    mainContentHtml += `<h1 class="font-merriweather">${bookContent.introduction.title}</h1>${formatContentForHTML(bookContent.introduction.content)}`;
    
    // Capítulos
    bookContent.chapters.forEach((chapter, index) => {
        mainContentHtml += `<div class="chapter-title-break" data-page="title-chapter-${index+1}"><h1 class="chapter-title-standalone">${chapter.title}</h1></div>`;
        mainContentHtml += `<h2>${chapter.title}</h2>${formatContentForHTML(chapter.introduction)}`;
        chapter.subchapters.forEach(subchapter => {
            mainContentHtml += `<h3>${subchapter.title}</h3>${formatContentForHTML(subchapter.content)}`;
        });
    });
    
    // Conclusão
    mainContentHtml += `<div class="chapter-title-break" data-page="title-conclusion"><h1 class="chapter-title-standalone">${bookContent.conclusion.title}</h1></div>`;
    mainContentHtml += `<h1 class="font-merriweather">${bookContent.conclusion.title}</h1>${formatContentForHTML(bookContent.conclusion.content)}`;
    mainContentHtml += `</div>`

    html += mainContentHtml;
    html += '</body></html>';

    return html;
  };

  const handleDownload = () => {
    if (!generatedHtml || !formData.title) return;
    setIsDownloading(true);
    setErrorMessage('');
    try {
        downloadAsPdf(formData.title, generatedHtml);
    } catch (error) {
        console.error("PDF Download failed:", error);
        setErrorMessage("Falha ao gerar o PDF. Tente novamente.");
    } finally {
        setTimeout(() => setIsDownloading(false), 1500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerationState('generating');
    setErrorMessage('');
    setLog([]);
    setGeneratedHtml(null);

    try {
        updateLog("Verificando permissões e créditos...");
        const check = await onBeforeGenerate();
        if (!check.allow) {
            throw new Error(check.message);
        }

        if (!isGeminiConfigured) {
            throw new Error("A chave da API do Gemini não está configurada. Edite o arquivo 'services/geminiConfig.ts'.");
        }

        updateLog("Inicializando IA Generativa...");
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

        const schema = {
            type: Type.OBJECT,
            properties: {
                introduction: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "O título da introdução do livro." },
                        content: { type: Type.STRING, description: "O conteúdo completo da introdução, com parágrafos separados por '\\n'." },
                    },
                    required: ['title', 'content']
                },
                table_of_contents: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "O título do sumário/índice. Ex: 'Sumário'." },
                        content: { type: Type.STRING, description: "Uma lista formatada de todos os 10 capítulos e seus 3 subcapítulos, separados por '\\n'." },
                    },
                    required: ['title', 'content']
                },
                chapters: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "O título do capítulo." },
                            introduction: { type: Type.STRING, description: "O conteúdo introdutório do capítulo, com parágrafos separados por '\\n'." },
                            subchapters: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING, description: "O título do subcapítulo." },
                                        content: { type: Type.STRING, description: "O conteúdo completo do subcapítulo, com parágrafos separados por '\\n'." },
                                    },
                                    required: ['title', 'content']
                                }
                            }
                        },
                        required: ['title', 'introduction', 'subchapters']
                    }
                },
                conclusion: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "Um título criativo para a seção final do livro, que NÃO seja 'Conclusão'." },
                        content: { type: Type.STRING, description: "O conteúdo completo da seção final, com parágrafos separados por '\\n'." },
                    },
                    required: ['title', 'content']
                }
            },
            required: ['introduction', 'table_of_contents', 'chapters', 'conclusion']
        };

        const prompt = `
            Você é um especialista em escrita de livros digitais.
            Sua tarefa é gerar o conteúdo completo para um livro com base nos detalhes fornecidos.
            O livro DEVE ter a seguinte estrutura RÍGIDA:
            1. Uma Introdução.
            2. Um Sumário (Índice), listando todos os capítulos e subcapítulos.
            3. EXATAMENTE 10 capítulos.
            4. Cada um dos 10 capítulos DEVE ter sua própria introdução e EXATAMENTE 3 subcapítulos.
            5. Uma seção final de encerramento, com um título criativo e apropriado que NÃO seja 'Conclusão'.

            O conteúdo deve ser prático, envolvente e alinhado com o tom de voz e o público-alvo definidos.
            O livro completo deve ter um volume substancial de texto, visando um total de palavras bem distribuído e robusto.

            Detalhes do Livro:
            - Título: ${formData.title}
            - Subtítulo: ${formData.subtitle}
            - Idioma: ${formData.language}
            - Tom de Voz: ${formData.tone}
            - Nicho/Público-alvo: ${formData.niche}
            - Resumo/Ideia Central: ${formData.summary}

            Siga ESTRITAMENTE a estrutura de JSON definida no schema. Não omita nenhum campo obrigatório.
            Escreva o conteúdo de forma detalhada e rica. Cada campo 'content' e 'introduction' deve ter vários parágrafos substanciais, com cada parágrafo separado por '\\n'. O campo 'content' do sumário deve ser uma lista formatada com os títulos dos capítulos e subcapítulos.
        `;
        
        updateLog("Enviando prompt para o modelo Gemini. Isso pode levar alguns minutos...");
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        updateLog("Resposta recebida da IA. Processando conteúdo...");
        
        let jsonText = response.text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.slice(7, -3).trim();
        } else if (jsonText.startsWith('```')) {
             jsonText = jsonText.slice(3, -3).trim();
        }

        const bookContent = JSON.parse(jsonText) as DetailedBookContent;

        if (!bookContent || !bookContent.chapters || bookContent.chapters.length === 0) {
            throw new Error("A IA não retornou capítulos. Tente novamente com um prompt mais detalhado.");
        }

        updateLog("Estrutura do livro validada. Gerando HTML final...");

        const finalHtml = generateBookHTML(formData, bookContent);
        setGeneratedHtml(finalHtml);

        const newBookData = {
            user_id: user.id,
            title: formData.title,
            subtitle: formData.subtitle,
            author: formData.author,
            content: finalHtml
        };
        
        const updatedCredits = user.book_credits - 1;
        
        updateLog("Salvando livro e atualizando créditos...");
        await onBookCreated(newBookData, updatedCredits);
        
        updateLog("Parabéns! Seu livro foi finalizado. Faça o download ou volte para o painel.");
        setGenerationState('success');

    } catch (err) {
        const genericError = "Ocorreu um erro inesperado. Verifique o console para mais detalhes.";
        // Type guard to get a more specific error message from Supabase/other errors.
        const resolvedErrorMessage = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : genericError;
        
        console.error("Book Generation Error:", err);
        setErrorMessage(`Falha na geração: ${resolvedErrorMessage}`);
        updateLog(`ERRO: ${resolvedErrorMessage}`);
        setGenerationState('error');
    }
  };

  const isLoading = generationState === 'generating';

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Formulário de Detalhes */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
           <Button onClick={() => onNavigate('dashboard')} variant="secondary" className="mb-6 inline-flex items-center">
                <ArrowLeftIcon />
                Voltar ao Dashboard
            </Button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Detalhes do Livro</h1>
          <p className="text-gray-600 mb-6">
            {generationState !== 'success'
              ? "Preencha os campos abaixo para dar à IA a direção certa."
              : "Seu livro está pronto! Faça o download abaixo."
            }
          </p>
          
           {generationState === 'success' ? (
            <div className="text-center mt-8 p-4 border-2 border-dashed border-green-300 bg-green-50 rounded-lg">
                <h2 className="text-2xl font-bold text-green-700">Parabéns! Seu livro foi finalizado.</h2>
                <p className="text-gray-600 mt-4 mb-6">Clique no botão piscando para fazer o download.</p>
                <div className="space-y-4">
                    <Button 
                      onClick={handleDownload} 
                      className="w-full animate-pulse" 
                      isLoading={isDownloading} 
                      loadingText="Gerando PDF...">
                        Baixar PDF
                    </Button>
                </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Título do Livro" name="title" value={formData.title} onChange={handleInputChange} required disabled={isLoading} />
              <Input label="Subtítulo" name="subtitle" value={formData.subtitle} onChange={handleInputChange} required disabled={isLoading} />
              <Input label="Nome do Autor" name="author" value={formData.author} onChange={handleInputChange} required disabled={isLoading} />
              <Input label="Idioma" name="language" value={formData.language} onChange={handleInputChange} required disabled={isLoading} />
              <Input label="Tom de Voz" name="tone" value={formData.tone} onChange={handleInputChange} required disabled={isLoading} />
              <Input label="Nicho" name="niche" value={formData.niche} onChange={handleInputChange} required disabled={isLoading} />
              <TextArea label="Resumo do Livro" name="summary" value={formData.summary} onChange={handleInputChange} required rows={6} disabled={isLoading} />
              <Button type="submit" className="w-full text-lg" isLoading={isLoading} disabled={isLoading}>
                Gerar Livro Agora
              </Button>
              {errorMessage && <p className="text-red-500 text-sm mt-2">{errorMessage}</p>}
            </form>
          )}
        </div>

        {/* Console de Progresso */}
        <div className="bg-gray-800 text-white p-6 sm:p-8 rounded-xl shadow-lg flex flex-col">
          <h2 className="text-2xl font-bold mb-4">Progresso da Geração</h2>
          <div ref={logContainerRef} className="bg-black rounded-md p-4 flex-grow h-96 overflow-y-auto font-mono text-sm">
            {log.map((line, index) => (
              <p key={index} className={`whitespace-pre-wrap ${line.startsWith('[') ? 'text-green-400' : ''} ${line.includes('ERRO') ? 'text-red-500' : ''} ${line.includes('Parabéns') ? 'text-yellow-300 font-bold' : ''}`}>{line}</p>
            ))}
          </div>
          {generationState === 'success' && (
            <Button 
                onClick={() => onNavigate('dashboard')} 
                variant="secondary" 
                className="mt-6 w-full"
            >
                Voltar ao Dashboard
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};