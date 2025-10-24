import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { UserProfile, Book, BookGenerationFormData, Page } from '../types';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';

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
            padding: 0;
            background: white;
        }
        .cover-title { 
            font-family: 'League Gothic', sans-serif; 
            font-size: 80px;
            font-weight: 400;
            text-transform: uppercase; 
            color: black;
            line-height: 1;
            margin: 0;
        }
        .cover-subtitle { 
            font-family: 'Merriweather Sans', sans-serif; 
            font-weight: 300; 
            font-size: 18px; 
            color: black;
            margin-top: 1.5cm;
            padding: 0 1cm;
        }
        .cover-author { 
            font-family: 'Merriweather Sans', sans-serif; 
            font-weight: 400;
            font-size: 14px; 
            text-transform: uppercase; 
            color: black;
            margin-top: 4cm;
        }

        /* --- Credits Page --- */
        .credits-page {
            text-align: center;
            font-family: 'Merriweather Sans', sans-serif;
            color: #555;
        }

        /* --- TOC Page --- */
        .toc-page { justify-content: flex-start; }
        .toc-page h1 { 
            font-family: 'Merriweather Sans', sans-serif; 
            font-weight: 600; 
            font-size: 24px; 
            text-align:center; 
            margin: 0 0 1.5em 0;
        }
        .toc-page ul { 
            list-style: none; 
            padding: 0; 
            font-family: 'Merriweather Sans', sans-serif; 
            font-size: 12px;
            line-height: 1.2;
        }
        .toc-page li { margin-bottom: 0.8em; }
        .toc-page ul ul { padding-left: 2em; margin-top: 0.8em; }
        .toc-page li strong { font-weight: 500; } /* Chapters */
        .toc-page ul ul li { font-weight: 300; } /* Subchapters */

        /* --- Content --- */
        .main-content h1 {
            font-family: 'Merriweather Sans', sans-serif; 
            font-weight: 300; 
            font-size: 24px; 
            text-align: center;
            margin-top: 2em;
            margin-bottom: 1.5em;
            page-break-before: always;
            page-break-after: avoid;
        }
        .main-content h1:first-child {
            page-break-before: auto;
        }
        .main-content h2 { 
            font-family: 'Merriweather Sans', sans-serif; 
            font-weight: 600; 
            font-size: 16px; 
            margin-top: 2em; 
            margin-bottom: 1em; 
            page-break-after: avoid;
        }
        
        .content-body { 
            line-height: 1.6;
            text-align: justify;
        }
        .content-body p { margin-bottom: 1em; text-indent: 1.5em; }
        .content-body p:first-of-type, h2 + p { text-indent: 0; }
        .chapter-intro { font-style: italic; margin-bottom: 2em; }

        /* --- Print Specific Styles --- */
        @page {
            size: A5;
            margin: 2.5cm 2cm;

            @top-center {
                content: "${bookData.title}";
                font-family: 'Merriweather Sans', sans-serif;
                font-size: 9pt;
                color: #808080;
                vertical-align: bottom;
                padding-bottom: 5mm;
            }

            @bottom-center {
                content: counter(page);
                font-family: 'Merriweather Sans', sans-serif;
                font-size: 9pt;
                color: #808080;
                vertical-align: top;
                padding-top: 5mm;
            }
        }
        
        @page :first {
            margin: 0;
            @top-center { content: "" }
            @bottom-center { content: "" }
        }
        
        @media print {
            body { background-color: white; }
            .page-container {
                margin: 0;
                padding: 0;
                box-shadow: none;
                width: auto;
                height: auto;
            }
            .cover-page, .credits-page, .toc-page {
                 page-break-after: always;
            }
        }
    </style>
    `;

    const tocHtml = `
      ${bookContent.chapters.map((chapter, index) => 
        `<li><strong>${chapter.title}</strong>
            <ul>${chapter.subchapters.map((sub) => `<li>${sub.title}</li>`).join('')}</ul>
        </li>`
      ).join('')}
    `;

    const mainContentHtml = `
      <h1>${bookContent.introduction.title}</h1>
      <div class="content-body">${formatContentForHTML(bookContent.introduction.content)}</div>
      
      ${bookContent.chapters.map((chapter) => `
          <h1>${chapter.title}</h1>
          <div class="content-body">
              <div class="chapter-intro">${formatContentForHTML(chapter.introduction)}</div>
              ${chapter.subchapters.map((sub) => `
                  <h2>${sub.title}</h2>
                  ${formatContentForHTML(sub.content)}
              `).join('')}
          </div>
      `).join('')}
      
      <h1>${bookContent.conclusion.title}</h1>
      <div class="content-body">${formatContentForHTML(bookContent.conclusion.content)}</div>
    `;

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${bookData.title}</title>
        ${styles}
    </head>
    <body>
        <div class="page-container single-page cover-page">
            <div>
                <h1 class="cover-title">${bookData.title}</h1>
                <h2 class="cover-subtitle">${bookData.subtitle}</h2>
                <h3 class="cover-author">${bookData.author}</h3>
            </div>
        </div>
        <div class="page-container single-page credits-page">
            <p>Copyright © ${year}, ${bookData.author}. Criado com suporte de LidIA Book Maker®</p>
        </div>
        <div class="page-container single-page toc-page">
            <div>
                <h1>Sumário</h1>
                <ul>
                    <li>${bookContent.introduction.title}</li>
                    ${tocHtml}
                    <li>${bookContent.conclusion.title}</li>
                </ul>
            </div>
        </div>
        <div class="page-container main-content">
            ${mainContentHtml}
        </div>
    </body>
    </html>`;
  };

  const handleDownload = (format: 'PDF' | 'DOCX') => {
    if (!generatedContent) return;
    const blob = new Blob([generatedContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = formData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${safeTitle}.${format === 'PDF' ? 'html' : 'html'}`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const generateWithRetry = async (ai: GoogleGenAI, request: any, maxRetries = 4) => {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await ai.models.generateContent(request);
        // Add a small delay to avoid hitting rate limits on rapid, consecutive calls
        await new Promise(resolve => setTimeout(resolve, 500));
        return result;
      } catch (err) {
        lastError = err as Error;
        const errorMessage = lastError.message.toLowerCase();
        
        if ((errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('unavailable')) && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
            updateLog(`Modelo sobrecarregado. Tentando novamente em ${Math.round(delay/1000)} segundo(s)... (Tentativa ${attempt}/${maxRetries-1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw lastError;
        }
      }
    }
    throw lastError || new Error("A geração falhou após múltiplas tentativas.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Admins bypass credit and IP checks
    if (user.role !== 'admin') {
      const check = await onBeforeGenerate();
      if (!check.allow) {
          setError(check.message);
          return;
      }
      if (user.book_credits <= 0) {
          setError("Você não tem créditos suficientes para criar um novo livro.");
          return;
      }
    }

    setIsLoading(true);
    setError('');
    setLog([]);
    setGeneratedContent(null);
    updateLog('Iniciando processo de geração do livro...');

    try {
      // FIX: Use process.env.API_KEY as per guidelines. This also resolves the TypeScript error.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Step 1: Generate Book Skeleton (Intro, Conclusion, 10 Chapters titles)
      updateLog('Gerando o esqueleto do livro (títulos)...');
      const skeletonPrompt = `Gere o esqueleto de um livro sobre "${formData.summary}" com o título "${formData.title}". O esqueleto deve ser um objeto JSON com três chaves: "introduction_title" (string), "chapter_titles" (um array de exatamente 10 strings, que são os títulos dos capítulos), e "conclusion_title" (uma string para um título criativo da conclusão).`;
      const skeletonResponse = await generateWithRetry(ai, {
        model: "gemini-2.5-flash", contents: skeletonPrompt,
        config: { responseMimeType: "application/json", responseSchema: {
            type: Type.OBJECT, properties: {
                introduction_title: { type: Type.STRING },
                chapter_titles: { type: Type.ARRAY, items: { type: Type.STRING } },
                conclusion_title: { type: Type.STRING }
            }
        }}
      });
      const skeleton = JSON.parse(skeletonResponse.text);
      if (!skeleton.chapter_titles || skeleton.chapter_titles.length !== 10) throw new Error("A IA não gerou 10 capítulos. Tente novamente.");

      updateLog('Esqueleto gerado. Detalhando sumário...');
      const detailedBookContent: DetailedBookContent = {
        introduction: { title: skeleton.introduction_title, content: ""},
        chapters: skeleton.chapter_titles.map((title: string) => ({ title, introduction: "", subchapters: [] })),
        conclusion: { title: skeleton.conclusion_title, content: "" }
      };

      // Step 2: Generate Subchapter titles for each chapter
      for (let i = 0; i < detailedBookContent.chapters.length; i++) {
        const chapterTitle = detailedBookContent.chapters[i].title;
        updateLog(`Gerando subcapítulos para: "${chapterTitle}"...`);
        const subchaptersPrompt = `Para o capítulo "${chapterTitle}" de um livro sobre "${formData.summary}", gere 3 títulos de subcapítulos. Retorne um objeto JSON com a chave "subchapter_titles", que é um array de 3 strings.`;
        const subchaptersResponse = await generateWithRetry(ai, {
            model: "gemini-2.5-flash", contents: subchaptersPrompt,
            config: { responseMimeType: "application/json", responseSchema: {
                type: Type.OBJECT, properties: {
                    subchapter_titles: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }}
        });
        const subchaptersJson = JSON.parse(subchaptersResponse.text);
        detailedBookContent.chapters[i].subchapters = subchaptersJson.subchapter_titles.map((title: string) => ({ title, content: "" }));
      }
      updateLog('Sumário detalhado concluído. Iniciando geração de conteúdo...');

      // Step 3: Generate Content for all parts
      updateLog(`Gerando conteúdo para: "${detailedBookContent.introduction.title}"...`);
      const introResponse = await generateWithRetry(ai, { model: 'gemini-2.5-flash', contents: `Escreva o conteúdo para a introdução "${detailedBookContent.introduction.title}" do livro "${formData.title}". O resumo geral é: "${formData.summary}". Escreva aproximadamente 1000 palavras.` });
      detailedBookContent.introduction.content = introResponse.text;

      for (let i = 0; i < detailedBookContent.chapters.length; i++) {
        const chapter = detailedBookContent.chapters[i];
        updateLog(`Gerando introdução para o Capítulo ${i + 1}: "${chapter.title}"...`);
        const chapIntroResponse = await generateWithRetry(ai, { model: 'gemini-2.5-flash', contents: `Escreva uma breve introdução (cerca de 280 palavras) para o capítulo "${chapter.title}" do livro "${formData.title}". Resumo do livro: "${formData.summary}".` });
        chapter.introduction = chapIntroResponse.text;

        for (let j = 0; j < chapter.subchapters.length; j++) {
            const subchapter = chapter.subchapters[j];
            updateLog(`-- Gerando subcapítulo: "${subchapter.title}"...`);
            const subchapResponse = await generateWithRetry(ai, { model: 'gemini-2.5-flash', contents: `Escreva o conteúdo para o subcapítulo "${subchapter.title}" (que faz parte do capítulo "${chapter.title}") do livro "${formData.title}". Mantenha um tom ${formData.tone}. Resumo do livro: "${formData.summary}". O idioma deve ser ${formData.language}. Escreva aproximadamente 600 palavras.` });
            subchapter.content = subchapResponse.text;
        }
        updateLog(`Capítulo ${i + 1} concluído.`);
      }

      updateLog(`Gerando conteúdo para: "${detailedBookContent.conclusion.title}"...`);
      const conclusionResponse = await generateWithRetry(ai, { model: 'gemini-2.5-flash', contents: `Escreva o conteúdo para a conclusão "${detailedBookContent.conclusion.title}" do livro "${formData.title}". O resumo geral é: "${formData.summary}". Escreva aproximadamente 1000 palavras.` });
      detailedBookContent.conclusion.content = conclusionResponse.text;

      // Step 4: Assemble and Finalize
      updateLog('Montando o documento final...');
      const finalHtml = generateBookHTML(formData, detailedBookContent);
      setGeneratedContent(finalHtml);
      
      const newBookData = {
        user_id: user.id,
        title: formData.title,
        subtitle: formData.subtitle,
        author: formData.author,
        generated_content: finalHtml,
      };

      const updatedCredits = user.role === 'admin' ? user.book_credits : user.book_credits - 1;
      onBookCreated(newBookData, updatedCredits);
      
      updateLog(user.role === 'admin'
        ? 'Livro gerado com sucesso! (Modo Admin - créditos não foram deduzidos)'
        : `Parabéns, seu livro está pronto! Você ainda tem ${updatedCredits} créditos.`
      );

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setError(`Falha na geração: ${errorMessage}`);
      updateLog(`ERRO: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const canGenerate = user.role === 'admin' || user.book_credits > 0;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
            <Button onClick={() => onNavigate('dashboard')} variant="secondary" className="inline-flex items-center">
                <ArrowLeftIcon />
                Voltar ao Dashboard
            </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coluna Esquerda: Formulário */}
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Detalhes do Livro</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Título do Livro" name="title" value={formData.title} onChange={handleInputChange} required />
              <Input label="Subtítulo" name="subtitle" value={formData.subtitle} onChange={handleInputChange} required />
              <Input label="Nome do Autor" name="author" value={formData.author} onChange={handleInputChange} required />
              <Input label="Idioma" name="language" value={formData.language} onChange={handleInputChange} required />
              <Input label="Tom de Voz" name="tone" value={formData.tone} onChange={handleInputChange} placeholder="Ex: Informativo, divertido, formal" required />
              <Input label="Nicho" name="niche" value={formData.niche} onChange={handleInputChange} placeholder="Ex: Finanças pessoais, ficção científica" required />
              <TextArea label="Resumo do Livro" name="summary" value={formData.summary} onChange={handleInputChange} placeholder="Descreva a ideia principal, os tópicos a serem abordados e o público-alvo." required />
              <Button type="submit" className="w-full text-lg" isLoading={isLoading} disabled={isLoading || !canGenerate}>
                {canGenerate ? 'Gerar Livro Agora' : 'Sem créditos restantes'}
              </Button>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </form>
          </div>

          {/* Coluna Direita: Feedback */}
          <div className="bg-gray-800 text-white rounded-xl shadow-lg p-6 md:p-8 flex flex-col">
            <h2 className="text-xl font-semibold text-gray-300 mb-4 border-b border-gray-600 pb-2">Progresso da Geração</h2>
            <div ref={logContainerRef} className="flex-grow bg-black rounded-md p-4 font-mono text-sm overflow-y-auto h-96">
              {log.length === 0 && <p className="text-gray-500">Aguardando início da geração...</p>}
              {log.map((line, index) => (
                <p key={index} className={`whitespace-pre-wrap ${line.includes('Tentando novamente') ? 'text-yellow-400' : (line.startsWith('ERRO') ? 'text-red-400' : 'text-green-400')}`}>
                  {line.startsWith('[') ? line : `  ${line}`}
                </p>
              ))}
            </div>
             {generatedContent && (
                 <div className="mt-6">
                     <h3 className="text-lg font-bold text-center text-green-400 mb-4">Seu livro foi gerado com sucesso!</h3>
                     <p className="text-xs text-center text-gray-400 mb-4">Para um PDF de alta fidelidade, use a função "Imprimir" do seu navegador e selecione "Salvar como PDF".</p>
                     <div className="flex space-x-4">
                         <Button onClick={() => handleDownload('PDF')} className="w-full">Baixar HTML (PDF)</Button>
                         <Button onClick={() => handleDownload('DOCX')} variant="secondary" className="w-full">Baixar HTML (DOCX)</Button>
                     </div>
                 </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};