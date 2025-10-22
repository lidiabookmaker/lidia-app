
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { UserProfile, Book, BookGenerationFormData, Page } from '../types';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';

interface CreateBookPageProps {
  user: UserProfile;
  onBookCreated: (book: Book, updatedCredits: number) => void;
  onNavigate: (page: Page) => void;
  apiKey: string | null;
  onBeforeGenerate: () => Promise<{ allow: boolean; message: string }>;
}

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);


export const CreateBookPage: React.FC<CreateBookPageProps> = ({ user, onBookCreated, onNavigate, apiKey, onBeforeGenerate }) => {
  const [formData, setFormData] = useState<BookGenerationFormData>({
    title: '',
    subtitle: '',
    author: user.email.split('@')[0],
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

  const generateBookHTML = (bookData: BookGenerationFormData, toc: string[], chaptersContent: string[]) => {
    const year = new Date().getFullYear();
    const coverImageUrl = 'https://www.brasix.com.br/wp-content/uploads/2025/10/FUNDO-CAPA-LIVRO.png';

    const tocHtml = toc.map(item => `<li>${item}</li>`).join('');

    const chaptersHtml = chaptersContent.map((content, index) => `
        <div class="page chapter-start">
            <h1>${toc[index]}</h1>
        </div>
        <div class="page content-page">
            <div class="content-body">
                ${content.split('\n').map(p => `<p>${p}</p>`).join('')}
            </div>
        </div>
    `).join('');

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${bookData.title}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Merriweather:wght@400;700&family=Merriweather+Sans:wght@300;400;600;700&display=swap');
            body { margin: 0; background-color: #ccc; }
            .page { 
                width: 14.8cm; height: 21cm; 
                margin: 2cm auto; 
                background-color: white; 
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                position: relative;
                page-break-after: always;
                box-sizing: border-box;
            }
            .cover-page {
                background-image: url('${coverImageUrl}');
                background-size: cover;
                background-position: center;
                color: white;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
            }
            .cover-content { text-align: center; }
            .cover-title { font-family: 'League Gothic', sans-serif; font-size: 72px; text-transform: uppercase; position: absolute; top: 5cm; left: 0; right: 0; }
            .cover-subtitle { font-family: 'Merriweather Sans', sans-serif; font-weight: 300; font-size: 18px; position: absolute; top: 10cm; left: 0; right: 0; padding: 0 2cm; }
            .cover-author { font-family: 'Merriweather Sans', sans-serif; font-size: 14px; text-transform: uppercase; position: absolute; top: 15cm; left: 0; right: 0; }
            
            .credits-page, .toc-page, .chapter-start {
                padding: 2cm;
                display: flex;
                flex-direction: column;
                justify-content: center;
                text-align: center;
            }
             .toc-page { justify-content: flex-start; text-align: left; }
            .toc-page h1 { font-family: 'Merriweather Sans', sans-serif; font-weight: 600; font-size: 18px; text-align:center; margin-bottom: 2em; }
            .toc-page ul { list-style: none; padding: 0; }
            .toc-page li { font-family: 'Merriweather Sans', sans-serif; font-weight: 400; font-size: 12px; margin-bottom: 0.5em; }

            .chapter-start h1 { font-family: 'Merriweather Sans', sans-serif; font-weight: 300; font-size: 24px; }
            
            .content-page { padding: 2cm; }
            .content-body { 
                font-family: 'Merriweather', serif; 
                color: #262626; 
                font-size: 12pt;
                line-height: 1.6;
                text-align: justify;
            }
             .content-body p { margin-bottom: 1em; text-indent: 1.5em; }

            .footer { position: absolute; bottom: 1cm; left: 0; right: 0; text-align: center; font-family: 'Merriweather Sans', sans-serif; font-size: 12pt; font-weight: 600; color: #808080; }
        </style>
    </head>
    <body>
        <div class="page cover-page">
            <div class="cover-content">
                <h1 class="cover-title">${bookData.title}</h1>
                <h2 class="cover-subtitle">${bookData.subtitle}</h2>
                <h3 class="cover-author">${bookData.author}</h3>
            </div>
        </div>
        <div class="page credits-page">
            <p>Copyright © ${year}, ${bookData.author}. Criado com suporte de LidIA Book Maker®</p>
        </div>
        <div class="page toc-page">
            <h1>Sumário</h1>
            <ul>${tocHtml}</ul>
        </div>
        ${chaptersHtml}
    </body>
    </html>`;
  };

  const handleDownload = (format: 'PDF' | 'DOCX') => {
    if (!generatedContent) return;
    const blob = new Blob([generatedContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = formData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    // Simulate different downloads by changing extension. In production, a server would convert this.
    a.download = `${safeTitle}.${format === 'PDF' ? 'html' : 'html'}`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Freemium pre-generation check
    const check = await onBeforeGenerate();
    if (!check.allow) {
        setError(check.message);
        return;
    }

    if (user.book_credits <= 0) {
        setError("Você não tem créditos suficientes para criar um novo livro.");
        return;
    }
    if (!apiKey) {
      setError("A chave da API não está configurada. Contate o administrador.");
      return;
    }

    setIsLoading(true);
    setError('');
    setLog([]);
    setGeneratedContent(null);
    updateLog('Iniciando processo de geração do livro...');

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Step 1: Generate Table of Contents
      updateLog('Conectando à IA para gerar o sumário...');
      const tocPrompt = `Baseado na seguinte ideia de livro, gere um sumário. Título: "${formData.title}", Resumo: "${formData.summary}". Retorne um objeto JSON com uma única chave "chapters" que é um array de strings, onde cada string é um título de capítulo. Não inclua números de capítulo nos títulos. O livro deve ter entre 5 e 8 capítulos.`;
      
      const tocResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: tocPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    chapters: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        }
      });
      
      const tocJson = JSON.parse(tocResponse.text);
      const chapters: string[] = tocJson.chapters;

      if (!chapters || chapters.length === 0) {
        throw new Error("Não foi possível gerar o sumário. Tente novamente com um resumo mais detalhado.");
      }

      updateLog(`Sumário gerado com ${chapters.length} capítulos.`);
      
      // Step 2: Generate Content for each chapter
      const chaptersContent: string[] = [];
      for (let i = 0; i < chapters.length; i++) {
        const chapterTitle = chapters[i];
        updateLog(`Gerando conteúdo para o Capítulo ${i + 1}: "${chapterTitle}"...`);
        
        const chapterPrompt = `Escreva o conteúdo para o capítulo intitulado "${chapterTitle}" do livro "${formData.title}" de ${formData.author}. Mantenha um tom ${formData.tone}. O resumo geral do livro é: "${formData.summary}". Sua escrita deve evitar deixar palavras únicas na última linha de um parágrafo. Não adicione títulos extras ou cabeçalhos "Capítulo X"; apenas escreva o conteúdo de texto bruto para o capítulo. O idioma deve ser ${formData.language}.`;

        const chapterResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: chapterPrompt
        });

        const content = chapterResponse.text;
        chaptersContent.push(content);
        updateLog(`Capítulo ${i + 1} concluído.`);
      }

      // Step 3: Assemble and Finalize
      updateLog('Montando o documento final...');
      const finalHtml = generateBookHTML(formData, chapters, chaptersContent);
      setGeneratedContent(finalHtml);
      
      const newBook: Book = {
        id: Date.now().toString(),
        userId: user.id,
        title: formData.title,
        subtitle: formData.subtitle,
        author: formData.author,
        createdAt: new Date().toISOString(),
        generatedContent: finalHtml,
      };

      const updatedCredits = user.book_credits - 1;
      onBookCreated(newBook, updatedCredits);

      updateLog(`Parabéns, seu livro está pronto! Você ainda tem ${updatedCredits} livros para criar.`);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setError(`Falha na geração: ${errorMessage}`);
      updateLog(`ERRO: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };


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
              <Button type="submit" className="w-full text-lg" isLoading={isLoading} disabled={isLoading || user.book_credits <= 0}>
                {user.book_credits > 0 ? 'Gerar Livro Agora' : 'Sem créditos restantes'}
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
                <p key={index} className={`whitespace-pre-wrap ${line.startsWith('[') ? 'text-green-400' : ''} ${line.startsWith('ERRO') ? 'text-red-400' : ''}`}>
                  {line}
                </p>
              ))}
            </div>
             {generatedContent && (
                 <div className="mt-6">
                     <h3 className="text-lg font-bold text-center text-green-400 mb-4">Seu livro foi gerado com sucesso!</h3>
                     <p className="text-xs text-center text-gray-400 mb-4">Nota: Os botões abaixo farão o download de um arquivo HTML estilizado. A conversão para PDF/DOCX real requer um serviço de back-end.</p>
                     <div className="flex space-x-4">
                         <Button onClick={() => handleDownload('PDF')} className="w-full">Baixar "PDF"</Button>
                         <Button onClick={() => handleDownload('DOCX')} variant="secondary" className="w-full">Baixar "DOCX"</Button>
                     </div>
                 </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};