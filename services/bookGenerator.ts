import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from './supabase';
import type { UserProfile, BookGenerationFormData, BookPart } from '../types';
import { GEMINI_API_KEY } from './geminiConfig';

// --- Types for the AI's expected JSON structure ---
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
  optimized_subtitle: string;
  introduction: { title: string; content: string };
  table_of_contents: { title: string; content: string; };
  chapters: Chapter[];
  conclusion: { title: string; content: string };
}
// --- End of Types ---

const bookSchema = {
    type: Type.OBJECT,
    properties: {
        optimized_title: { type: Type.STRING, description: "O título final otimizado para a capa, com no máximo 45 caracteres sem contar os espaços." },
        optimized_subtitle: { type: Type.STRING, description: "O subtítulo final otimizado para a capa, com no máximo 90 caracteres sem contar os espaços." },
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
    required: ['optimized_title', 'optimized_subtitle', 'introduction', 'table_of_contents', 'chapters', 'conclusion']
};


const buildPrompt = (formData: BookGenerationFormData): string => {
    return `
      Por favor, crie o conteúdo completo para um livro digital com as seguintes especificações.
      O formato da resposta DEVE ser um JSON válido que corresponda ao esquema fornecido.
      NÃO inclua markdown (como \`\`\`json) na sua resposta. A resposta deve ser APENAS o JSON.

      **Instruções Gerais de Conteúdo:**
      /* - Para todos os campos de texto como 'content' e 'introduction', o texto DEVE ser dividido em múltiplos parágrafos para boa legibilidade. Use o caractere de nova linha (\\n) para separar os parágrafos dentro da string do JSON. Cada parágrafo deve ter um tamanho razoável, evitando "paredes de texto". */
      - Para todos os campos de texto como 'content' e 'introduction', siga estas regras de formatação de parágrafos:
        - O texto DEVE ser dividido em múltiplos parágrafos curtos e dinâmicos para garantir excelente legibilidade em um formato de livro A5.
        - Use o caractere de nova linha (\\n) para separar cada parágrafo.
        - **REGRA OBRIGATÓRIA:** A grande maioria dos parágrafos deve ter um comprimento entre 30 e 80 palavras. Evite parágrafos com mais de 100 palavras a todo custo.
        - Varie o tamanho dos parágrafos para criar um ritmo de leitura agradável. É permitido ter parágrafos de uma única frase, se isso criar um efeito dramático ou de ênfase.
        - Não crie "paredes de texto". Pense visualmente.

      **Instruções para Título e Subtítulo:**
      - **Sugestão de Título (do usuário):** "${formData.title}"
      - **Sugestão de Subtítulo (do usuário):** "${formData.subtitle}"
      - Crie um **Título Final Otimizado** para a capa. REGRAS: Máximo de 45 caracteres (sem contar espaços), impactante e divisível em 2-3 linhas. O campo no JSON DEVE ser \`optimized_title\`.
      - Crie um **Subtítulo Final Otimizado** para a capa. REGRAS: Máximo de 90 caracteres (sem contar espaços). O campo no JSON DEVE ser \`optimized_subtitle\`.

      **Outras Informações:**
      **Autor:** ${formData.author}
      **Idioma:** ${formData.language}
      **Tom de voz:** ${formData.tone}
      **Nicho/Assunto:** ${formData.niche}
      **Resumo do conteúdo desejado:** ${formData.summary}
      
      **Estrutura e Contagem de Palavras (REGRAS OBRIGATÓRIAS):**
      - **Introdução:** No mínimo 400 palavras, divididas em múltiplos parágrafos usando \\n. O título DEVE ser "Introdução".
      - **Sumário:** O título DEVE ser "Sumário". O conteúdo deve ser APENAS a lista de todos os 10 capítulos e seus 3 subcapítulos, formatada como texto simples com quebras de linha. Exemplo: 'Capítulo 1: Título do Capítulo\\n- Subcapítulo 1.1\\n- Subcapítulo 1.2'. NÃO inclua nenhum parágrafo de introdução ou texto descritivo para o sumário.
      - **Capítulos:** Crie exatamente 10 capítulos. O total de palavras por capítulo deve ser no mínimo 2100 palavras.
        - **Introdução do Capítulo:** No mínimo 300 palavras, divididas em múltiplos parágrafos usando \\n.
        - **Subcapítulos:** Crie exatamente 3 subcapítulos para cada capítulo.
          - **Conteúdo de cada Subcapítulo:** No mínimo 600 palavras, divididas em múltiplos parágrafos usando \\n.
      - **Conclusão:** No mínimo 600 palavras, divididas em múltiplos parágrafos usando \\n. O título DEVE ser "Conclusão".
      
      **Instruções Adicionais para Títulos de Capítulo:**
      - Para o título de cada capítulo na estrutura JSON (\`chapters[].title\`), forneça APENAS o nome do capítulo (ex: "Os Pilares da Alimentação Saudável"), sem o prefixo numérico como "Capítulo 1:".

      É CRUCIAL que o conteúdo total do livro atinja no mínimo 22.800 palavras. A IA deve expandir os tópicos com detalhes, exemplos e analogias para atingir este volume.
    `;
};

/**
 * Orchestrates the entire book generation pipeline.
 * @param formData - The data submitted by the user.
 * @param user - The current user profile.
 * @param updateLog - A callback function to send real-time progress updates to the UI.
 * @returns The ID of the newly created book.
 */
export const generateBookContent = async (
    formData: BookGenerationFormData,
    user: UserProfile,
    updateLog: (message: string) => void
): Promise<string> => {
    updateLog("Inicializando Lidia SNT® Core Inside . . .");
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = buildPrompt(formData);
    updateLog("Prompt para Lidia criado . . .");

    updateLog("Enviando requisição para Lidia . . .");
    let response;

    // CORREÇÃO: Usando a versão 1.5 real e priorizando o Flash (gratuito e rápido)
const modelsToTry: string[] = ['gemini-2.5-flash']; 
      
    for (const model of modelsToTry) {
        try {
            updateLog(`Iniciando geração com o modelo otimizado: ${model}...`);
            
            response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: bookSchema
                }
            });
            updateLog(`Sucesso com o modelo: ${model}.`);
            break; 
        } catch (error) {
            const err = error as Error;
            console.error(`Erro no modelo ${model}:`, err);
            throw error;
        }
    }




/*
    const modelsToTry: ('gemini-2.5-pro' | 'gemini-2.5-flash')[] = ['gemini-2.5-pro', 'gemini-2.5-flash'];
      
    for (const model of modelsToTry) {
        try {
            if (model === 'gemini-2.5-pro') {
                updateLog("SNT® started in deep research, content planning, and simultaneous semantic writing intensive work.");
            } else {
                updateLog(`Tentando com o modelo: ${model}...`);
            }
            
            response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: bookSchema
                }
            });
            updateLog(`Sucesso com o modelo: ${model}.`);
            break; 
        } catch (error) {
            const err = error as Error;
            // If it's the last model or the error is not 'overloaded', rethrow it.
            if (model === modelsToTry[modelsToTry.length - 1] || !err.message.toLowerCase().includes('overloaded')) {
                throw error;
            }
            updateLog(`Modelo ${model} sobrecarregado. Tentando o próximo modelo...`);
        }
    }  */

    if (!response) {
        throw new Error("Todos os modelos de IA falharam ou estão indisponíveis.");
    }

    updateLog("Resposta da IA recebida e validada.");

    let jsonText = response.text.trim();
    const bookContent: DetailedBookContent = JSON.parse(jsonText);
    const finalTitle = bookContent.optimized_title;
    const finalSubtitle = bookContent.optimized_subtitle;
    updateLog(`Título otimizado pela IA: "${finalTitle}"`);
    updateLog(`Subtítulo otimizado pela IA: "${finalSubtitle}"`);
    
    updateLog("Iniciando salvamento do livro no banco de dados...");
    const { data: newBook, error: bookError } = await supabase
      .from('books')
      .insert({
          user_id: user.id,
          title: finalTitle,
          subtitle: finalSubtitle,
          author: formData.author,
          status: 'processing_parts', // New initial status
      })
      .select()
      .single();
  
    if (bookError) throw bookError;
    updateLog(`Registro principal do livro criado com ID: ${newBook.id}`);

    const partsToInsert: Omit<BookPart, 'id'>[] = [];
    let partIndex = 1;

    // 1. Cover
    partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'cover', content: JSON.stringify({ title: finalTitle, subtitle: finalSubtitle, author: formData.author }) });
    // 2. Copyright
    partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'copyright', content: JSON.stringify(`Copyright © ${new Date().getFullYear()} ${formData.author}`) });
    // 3. Table of Contents
    partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'toc', content: JSON.stringify(bookContent.table_of_contents) });
    // 4. Introduction
    partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'introduction', content: JSON.stringify(bookContent.introduction) });
    // 5. Chapters (each chapter is broken into two parts: title and content)
    bookContent.chapters.forEach(chapter => {
        partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_title', content: JSON.stringify({ title: chapter.title }) });
        // The entire chapter object is saved as the content for the 'chapter_content' part
        partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_content', content: JSON.stringify(chapter) });
    });
    // 6. Conclusion
    partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'conclusion', content: JSON.stringify(bookContent.conclusion) });

    updateLog(`Preparando ${partsToInsert.length} partes do livro para salvar...`);
    const { error: partsError } = await supabase.from('book_parts').insert(partsToInsert);
    if (partsError) throw partsError;
    updateLog("Todas as partes do livro foram salvas com sucesso.");

    updateLog("Atualizando status final do livro...");
    const { error: updateStatusError } = await supabase.from('books').update({ status: 'content_ready' }).eq('id', newBook.id);
    if(updateStatusError) throw updateStatusError;

    const newCredits = user.book_credits - 1;
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ book_credits: newCredits })
      .eq('id', user.id);
    if (profileError) throw profileError;
    updateLog("Créditos do usuário atualizados.");

    return newBook.id;
};