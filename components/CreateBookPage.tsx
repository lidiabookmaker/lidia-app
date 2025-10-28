import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { UserProfile, Book, BookGenerationFormData, Page } from '../types';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';
import { API_KEY } from '../services/geminiConfig';

interface CreateBookPageProps {
  user: UserProfile;
  onBookCreated: (bookData: Omit<Book, 'id' | 'created_at'>, updatedCredits: number) => void;
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
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
    return text.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
  }

  const generateBookHTML = (bookData: BookGenerationFormData, bookContent: DetailedBookContent) => {
    const year = new Date().getFullYear();
    
    const styles = `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Merriweather:wght@400;700&family=Merriweather+Sans:wght@300;400;600;700&display=swap');
        
        /* --- General & Screen Styles --- */
        body { 
            margin: 0; 
            background-color: #ccc; 
            font-family: 'Merriweather', serif;
            font-size: 12pt;
            color: #262626;
        }
        .page-container { 
            background-color: white; 
            width: 14.8cm; 
            margin: 2cm auto; 
            padding: 2cm;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            box-sizing: border-box;
        }
        .single-page {
            height: 21cm;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        /* --- Cover Page --- */
        .cover-page {
            text-align: center;
            border: 2px solid black;
            height: 100%;
        }
        .cover-page .title {
            font-family: 'League Gothic', sans-serif;
            font-size: 60pt;
            text-transform: uppercase;
            margin: 0;
            line-height: 1;
            padding: 0 1cm;
        }
        .cover-page .subtitle {
            font-family: 'Merriweather Sans', sans-serif;
            font-size: 18pt;
            margin: 0.5cm 0 1cm 0;
        }
        .cover-page .author {
            font-family: 'Merriweather Sans', sans-serif;
            font-size: 16pt;
            font-weight: 600;
        }

        /* --- Copyright Page --- */
        .copyright-page {
           justify-content: flex-end;
        }
        .copyright-page p {
            font-size: 9pt;
            color: #595959;
            text-align: center;
            line-height: 1.5;
        }

        /* --- Content Pages --- */
        .content-page h1, .content-page h2, .content-page h3 {
            font-family: 'Merriweather Sans', sans-serif;
            font-weight: 700;
        }
        .content-page h1 { font-size: 24pt; margin-bottom: 1cm; page-break-before: always; }
        .content-page h2 { font-size: 18pt; margin-top: 1cm; margin-bottom: 0.5cm; }
        .content-page h3 { font-size: 14pt; font-weight: 600; margin-top: 0.8cm; margin-bottom: 0.3cm;}
        .content-page p { 
            line-height: 1.6; 
            text-align: justify;
            margin-bottom: 0.4cm;
        }
         .content-page p:first-of-type {
            text-indent: 1cm;
        }

        /* --- Print Styles --- */
        @media print {
            body { background-color: white; }
            .page-container { 
                width: 14.8cm; 
                height: 21cm; 
                margin: 0; 
                padding: 2cm;
                box-shadow: none;
                page-break-after: always;
            }
        }
    </style>
    `;

    // --- Montagem do HTML ---
    let html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${bookData.title}</title>${styles}</head><body>`;

    // Capa
    html += `
        <div class="page-container single-page cover-page">
            <div>
                <h1 class="title">${bookData.title}</h1>
                <p class="subtitle">${bookData.subtitle}</p>
                <p class="author">${bookData.author}</p>
            </div>
        </div>
    `;
    
    // Copyright
    html += `
        <div class="page-container single-page copyright-page">
            <div>
                 <p>Copyright © ${year} ${bookData.author}</p>
                 <p>Todos os direitos reservados. Nenhuma parte desta publicação pode ser reproduzida, distribuída ou transmitida de qualquer forma ou por qualquer meio, incluindo fotocópia, gravação ou outros métodos eletrônicos ou mecânicos, sem a permissão prévia por escrito do autor, exceto no caso de breves citações incorporadas em resenhas críticas e outros usos não comerciais permitidos pela lei de direitos autorais.</p>
            </div>
        </div>
    `;

    // Conteúdo Principal
    html += '<div class="page-container content-page">';
    // Introdução
    html += `<h1>${bookContent.introduction.title}</h1>${formatContentForHTML(bookContent.introduction.content)}`;
    
    // Capítulos
    bookContent.chapters.forEach(chapter => {
        html += `<h1>${chapter.title}</h1>${formatContentForHTML(chapter.introduction)}`;
        chapter.subchapters.forEach(subchapter => {
            html += `<h3>${subchapter.title}</h3>${formatContentForHTML(subchapter.content)}`;
        });
    });

    // Conclusão
    html += `<h1>${bookContent.conclusion.title}</h1>${formatContentForHTML(bookContent.conclusion.content)}`;

    html += '</div>'; // Fecha content-page

    html += '</body></html>';

    return html;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setLog([]);
    setGeneratedContent(null);

    try {
        updateLog("Verificando permissões e créditos...");
        const check = await onBeforeGenerate();
        if (!check.allow) {
            throw new Error(check.message);
        }

        // fix: Uses the imported API_KEY from geminiConfig.ts, which correctly reads the VITE_API_KEY.
        if (!API_KEY || API_KEY === "API_KEY_NOT_SET") {
            throw new Error("A chave da API não foi encontrada no ambiente. Contate o administrador.");
        }

        updateLog("Inicializando IA Generativa...");
        // fix: Initialized GoogleGenAI with the correctly sourced API_KEY.
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const schema = {
            type: Type.OBJECT,
            properties: {
                introduction: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                    }
                },
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
                                    }
                                }
                            }
                        }
                    }
                },
                conclusion: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                    }
                }
            }
        };

        const prompt = `
            Você é um especialista em escrita de livros digitais.
            Sua tarefa é gerar o conteúdo completo para um livro com base nos detalhes fornecidos.
            O livro deve ter uma introdução, 3 capítulos (cada um com uma introdução e 3 subcapítulos) e uma conclusão.
            O conteúdo deve ser prático, envolvente e alinhado com o tom de voz e o público-alvo definidos.

            Detalhes do Livro:
            - Título: ${formData.title}
            - Subtítulo: ${formData.subtitle}
            - Idioma: ${formData.language}
            - Tom de Voz: ${formData.tone}
            - Nicho/Público-alvo: ${formData.niche}
            - Resumo/Ideia Central: ${formData.summary}

            Por favor, gere o conteúdo completo seguindo a estrutura de JSON solicitada.
            Escreva o conteúdo de forma detalhada e rica. Cada parágrafo deve ser uma nova linha (separado por '\\n').
        `;
        
        updateLog("Enviando prompt para o modelo Gemini. Isso pode levar alguns minutos...");
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        updateLog("Resposta recebida da IA. Processando conteúdo...");

        const bookContent = JSON.parse(response.text) as DetailedBookContent;

        if (!bookContent.chapters || bookContent.chapters.length === 0) {
            throw new Error("A IA não retornou capítulos. Tente novamente com um prompt mais detalhado.");
        }

        updateLog("Estrutura do livro validada. Gerando HTML final...");

        const finalHtml = generateBookHTML(formData, bookContent);
        setGeneratedContent(finalHtml);

        const newBookData = {
            user_id: user.id,
            title: formData.title,
            subtitle: formData.subtitle,
            author: formData.author,
            generated_content: finalHtml
        };
        
        const updatedCredits = user.book_credits - 1;
        
        updateLog("Salvando livro e atualizando créditos...");
        await onBookCreated(newBookData, updatedCredits);
        
        updateLog("Livro gerado e salvo com sucesso! Redirecionando...");
        
        // Navigate away after a short delay to allow the user to see the success message
        setTimeout(() => {
            onNavigate('dashboard');
        }, 2000);

    } catch (err) {
        const genericError = "Ocorreu um erro inesperado durante a geração do livro. Verifique o console para mais detalhes.";
        const errorMessage = (err instanceof Error) ? err.message : genericError;
        
        console.error("Book Generation Error:", err);
        setError(errorMessage);
        updateLog(`ERRO: ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  };


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
          <p className="text-gray-600 mb-6">Preencha os campos abaixo para dar à IA a direção certa.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Título do Livro" name="title" value={formData.title} onChange={handleInputChange} required />
            <Input label="Subtítulo" name="subtitle" value={formData.subtitle} onChange={handleInputChange} required />
            <Input label="Nome do Autor" name="author" value={formData.author} onChange={handleInputChange} required />
            <Input label="Idioma" name="language" value={formData.language} onChange={handleInputChange} required />
            <Input label="Tom de Voz" name="tone" value={formData.tone} onChange={handleInputChange} required />
            <Input label="Nicho" name="niche" value={formData.niche} onChange={handleInputChange} required />
            <TextArea label="Resumo do Livro" name="summary" value={formData.summary} onChange={handleInputChange} required rows={6} />
            <Button type="submit" className="w-full text-lg" isLoading={isLoading}>
              Gerar Livro Agora
            </Button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </form>
        </div>

        {/* Console de Progresso */}
        <div className="bg-gray-800 text-white p-6 sm:p-8 rounded-xl shadow-lg flex flex-col">
          <h2 className="text-2xl font-bold mb-4">Progresso da Geração</h2>
          <div ref={logContainerRef} className="bg-black rounded-md p-4 flex-grow h-96 overflow-y-auto font-mono text-sm">
            {log.map((line, index) => (
              <p key={index} className={`whitespace-pre-wrap ${line.startsWith('[') ? 'text-green-400' : ''} ${line.includes('ERRO') ? 'text-red-500' : ''}`}>{line}</p>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};