import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from './supabase';
import type { UserProfile, BookGenerationFormData } from '../types';
import { GEMINI_API_KEY } from './geminiConfig';

// --- SCHEMA DO LIVRO COMPLETO (MONÓLITO) ---
// Exatamente como era na versão que funcionava
const bookSchema = {
    type: Type.OBJECT,
    properties: {
        optimized_title: { type: Type.STRING },
        optimized_subtitle: { type: Type.STRING },
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

// --- PROMPT GIGANTE (ÚNICO) ---
const buildPrompt = (formData: BookGenerationFormData): string => {
    return `
      Atue como um escritor profissional. Crie um livro COMPLETO agora.
      
      Dados do Livro:
      - Título: "${formData.title}"
      - Subtítulo: "${formData.subtitle}"
      - Nicho: "${formData.niche}"
      - Autor: "${formData.author}"
      - Resumo: "${formData.summary}"
      - Tom: "${formData.tone}"
      
      REGRAS ESTRUTURAIS:
      1. Crie Título e Subtítulo otimizados.
      2. Crie uma Introdução completa.
      3. Crie EXATAMENTE 10 Capítulos.
      4. Cada Capítulo deve ter Intro + 3 Subcapítulos.
      5. Crie uma Conclusão completa.
      
      REGRAS DE CONTEÚDO:
      - Texto fluído, parágrafos bem divididos com \\n.
      - Mínimo de 600 palavras por subcapítulo.
      - Total do livro deve ser extenso e detalhado.
      
      Responda APENAS com o JSON seguindo o schema.
    `;
};

// --- FUNÇÃO PRINCIPAL (RESTAURADA) ---
export const generateBookContent = async (
    formData: BookGenerationFormData,
    user: UserProfile,
    updateLog: (message: string) => void
): Promise<string> => {
    
    // Configura o cliente
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    updateLog("Inicializando conexão com Lidia AI...");
    updateLog("Enviando prompt estrutural completo...");
    
    try {
        // Tenta usar o modelo Flash (mais rápido/barato) ou Pro
        // Se sua chave funcionava antes, provavelmente era com um desses
        const modelName = 'gemini-1.5-flash'; 

        updateLog(`Processando conteúdo com modelo ${modelName}... (Isso pode levar alguns minutos)`);

        // CHAMADA ÚNICA (O jeito que funcionava)
        const result = await ai.models.generateContent({
            model: modelName,
            contents: buildPrompt(formData),
            config: {
                responseMimeType: "application/json",
                responseSchema: bookSchema
            }
        });

        updateLog("Resposta da IA recebida! Processando dados...");
        
        const responseText = result.text();
        if (!responseText) throw new Error("Resposta vazia da IA");
        
        const bookContent = JSON.parse(responseText);

        // --- SALVAMENTO NO BANCO ---
        updateLog("Salvando livro no banco de dados...");

        // 1. Cria o Livro
        const { data: newBook, error: bookError } = await supabase
            .from('books')
            .insert({
                user_id: user.id,
                title: bookContent.optimized_title || formData.title,
                subtitle: bookContent.optimized_subtitle || formData.subtitle,
                author: formData.author,
                status: 'processing_parts',
            })
            .select()
            .single();
    
        if (bookError) throw bookError;
        updateLog(`Livro criado ID: ${newBook.id}`);

        // 2. Prepara as Partes
        let partIndex = 1;
        const partsToInsert: any[] = [];

        // Capa
        partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'cover', content: JSON.stringify({ title: newBook.title, subtitle: newBook.subtitle, author: formData.author }) });
        
        // Copyright
        partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'copyright', content: JSON.stringify(`Copyright © ${new Date().getFullYear()} ${formData.author}`) });
        
        // TOC
        partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'toc', content: JSON.stringify(bookContent.table_of_contents) });
        
        // Intro
        partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'introduction', content: JSON.stringify(bookContent.introduction) });

        // Capítulos
        if (bookContent.chapters && Array.isArray(bookContent.chapters)) {
            bookContent.chapters.forEach((chapter: any) => {
                // Título do Cap
                partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_title', content: JSON.stringify({ title: chapter.title }) });
                // Conteúdo do Cap (Intro + Subs)
                partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_content', content: JSON.stringify(chapter) });
            });
        }

        // Conclusão
        partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'conclusion', content: JSON.stringify(bookContent.conclusion) });

        // Salva tudo
        const { error: partsError } = await supabase.from('book_parts').insert(partsToInsert);
        if (partsError) throw partsError;

        // Finaliza
        await supabase.from('books').update({ status: 'content_ready' }).eq('id', newBook.id);
        await supabase.from('profiles').update({ book_credits: user.book_credits - 1 }).eq('id', user.id);

        updateLog("Sucesso! Livro gerado e salvo.");
        return newBook.id;

    } catch (error: any) {
        console.error("Erro na geração:", error);
        updateLog(`Erro Fatal: ${error.message}`);
        throw error;
    }
};