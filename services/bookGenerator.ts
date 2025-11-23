import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from './supabase';
import type { UserProfile, BookGenerationFormData } from '../types';
import { GEMINI_API_KEY } from './geminiConfig';

// --- SCHEMAS (TIPOS PARA A IA) ---

const outlineSchema = {
    type: Type.OBJECT,
    properties: {
        optimized_title: { type: Type.STRING, description: "Título otimizado para a capa." },
        optimized_subtitle: { type: Type.STRING, description: "Subtítulo otimizado para a capa." },
        introduction_outline: { type: Type.STRING, description: "Breve resumo do que será a introdução." },
        chapters: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    chapter_number: { type: Type.INTEGER },
                    title: { type: Type.STRING, description: "O título deste capítulo." },
                    subchapters_list: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "Lista de 3 títulos de subcapítulos para este capítulo."
                    }
                },
                required: ['chapter_number', 'title', 'subchapters_list']
            }
        },
        conclusion_outline: { type: Type.STRING, description: "Breve resumo da conclusão." }
    },
    required: ['optimized_title', 'optimized_subtitle', 'chapters']
};

const chapterContentSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        introduction: { type: Type.STRING, description: "Texto introdutório do capítulo (múltiplos parágrafos com \\n)." },
        subchapters: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING, description: "Texto rico do subcapítulo (600+ palavras, parágrafos com \\n)." }
                },
                required: ['title', 'content']
            }
        }
    },
    required: ['title', 'introduction', 'subchapters']
};

const sectionContentSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        content: { type: Type.STRING, description: "Texto completo (múltiplos parágrafos com \\n)." }
    },
    required: ['title', 'content']
};


// --- PROMPTS ---

const buildOutlinePrompt = (formData: BookGenerationFormData): string => {
    return `
      Atue como um Arquiteto Editorial de Elite. Planeje a estrutura de um best-seller.
      Dados: Título="${formData.title}", Nicho="${formData.niche}", Público="${formData.tone}", Resumo="${formData.summary}".
      Requisitos:
      1. Otimize Título e Subtítulo.
      2. Crie EXATAMENTE 10 CAPÍTULOS lógicos.
      3. Defina 3 subcapítulos para cada.
      Responda APENAS com o JSON.
    `;
};

const buildChapterPrompt = (chapterTitle: string, subchapters: string[], context: string): string => {
    return `
      Atue como um Ghostwriter Profissional. Escreva o conteúdo do capítulo: "${chapterTitle}".
      Contexto: ${context}
      Estrutura:
      - Intro do Capítulo (min. 300 palavras).
      - Subcapítulo 1: "${subchapters[0]}" (min. 600 palavras).
      - Subcapítulo 2: "${subchapters[1]}" (min. 600 palavras).
      - Subcapítulo 3: "${subchapters[2]}" (min. 600 palavras).
      Regras: Parágrafos curtos, use \\n, tom envolvente.
      Responda APENAS com o JSON.
    `;
};

const buildSectionPrompt = (sectionType: 'Introdução' | 'Conclusão', context: string): string => {
    return `Escreva a ${sectionType} completa (min 600 palavras) para este livro. Contexto: ${context}. Responda APENAS com o JSON.`;
};


// --- HELPER: GERADOR COM RETRY ROBUSTO ---
// Tenta uma lista extensa de modelos para garantir que algum funcione

const generateSafeContent = async (
    ai: GoogleGenAI, 
    prompt: string, 
    schema: any, 
    logFunc: (msg: string) => void
): Promise<any> => {
    
    // LISTA DE FALLBACKS: Do mais novo para o mais antigo/estável
    const modelsToTry = [
        'gemini-1.5-pro',           // Tentativa 1: Pro Atual
        'gemini-1.5-flash',         // Tentativa 2: Flash Atual
        'gemini-1.5-pro-latest',    // Tentativa 3: Variação de nome
        'gemini-1.5-flash-latest',  // Tentativa 4: Variação de nome
        'gemini-pro',               // Tentativa 5: O Clássico (Estável)
        'gemini-1.0-pro'            // Tentativa 6: Legado
    ];
    
    let lastError: any;

    for (const model of modelsToTry) {
        try {
            // Descomente para debug se necessário
            // console.log(`Tentando modelo: ${model}`);
            
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: schema }
            });

            // Sucesso!
            return JSON.parse(response.text.trim());

        } catch (error: any) {
            // Apenas loga no console do navegador/servidor, não polui a UI do usuário
            console.warn(`Falha silenciosa no modelo ${model}: ${error.message}`);
            lastError = error;
            
            // Se for um dos principais e falhar, avisa o usuário que está trocando de motor
            if (model === 'gemini-1.5-pro') {
                logFunc(`⚠️ Otimizando conexão com IA... Alternando para motor de redundância.`);
            }
        }
    }

    // Se sair do loop, realmente nada funcionou
    throw new Error(`Falha geral na IA. Verifique sua API Key. Detalhe: ${lastError?.message}`);
};


// --- FUNÇÃO PRINCIPAL ---

export const generateBookContent = async (
    formData: BookGenerationFormData,
    user: UserProfile,
    updateLog: (message: string) => void
): Promise<string> => {
    
    updateLog("Inicializando Lidia SNT® Core (Multi-Model Architecture)...");
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const bookContext = `Livro: ${formData.title}. Nicho: ${formData.niche}. Objetivo: ${formData.summary}`;

    // -----------------------------------------------------------------------
    // FASE 1: ESTRUTURA
    // -----------------------------------------------------------------------
    updateLog("Fase 1: Desenhando o Blueprint Editorial...");
    
    const outline = await generateSafeContent(ai, buildOutlinePrompt(formData), outlineSchema, updateLog);
    
    updateLog(`Título Definido: "${outline.optimized_title}"`);
    updateLog(`Estrutura Aprovada: ${outline.chapters.length} Capítulos detectados.`);

    const { data: newBook, error: bookError } = await supabase
        .from('books')
        .insert({
            user_id: user.id,
            title: outline.optimized_title,
            subtitle: outline.optimized_subtitle,
            author: formData.author,
            status: 'processing_parts',
        })
        .select()
        .single();
    if (bookError) throw bookError;

    let partIndex = 1;
    await supabase.from('book_parts').insert([
        { book_id: newBook.id, part_index: partIndex++, part_type: 'cover', content: JSON.stringify({ title: outline.optimized_title, subtitle: outline.optimized_subtitle, author: formData.author }) },
        { book_id: newBook.id, part_index: partIndex++, part_type: 'copyright', content: JSON.stringify(`Copyright © ${new Date().getFullYear()} ${formData.author}`) }
    ]);

    // -----------------------------------------------------------------------
    // FASE 2: INTRODUÇÃO
    // -----------------------------------------------------------------------
    updateLog("Escrevendo Introdução...");
    const introContent = await generateSafeContent(ai, buildSectionPrompt('Introdução', bookContext), sectionContentSchema, updateLog);
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'introduction', content: JSON.stringify(introContent) });

    // Salva TOC
    const tocContent = {
        title: "Sumário",
        content: outline.chapters.map((c: any) => `${c.chapter_number}. ${c.title}`).join('\n')
    };
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'toc', content: JSON.stringify(tocContent) });

    // -----------------------------------------------------------------------
    // FASE 3: O LOOP MATRIX
    // -----------------------------------------------------------------------
    updateLog("Iniciando Motor de Escrita Sequencial...");

    for (const chapter of outline.chapters) {
        const chapterNum = chapter.chapter_number;
        
        updateLog(`[SNT Core] Escrevendo Cap ${chapterNum}: "${chapter.title}"...`);
        
        try {
            const chapContent = await generateSafeContent(
                ai, 
                buildChapterPrompt(chapter.title, chapter.subchapters_list, bookContext), 
                chapterContentSchema, 
                updateLog
            );

            await supabase.from('book_parts').insert([
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_title', content: JSON.stringify({ title: chapContent.title }) },
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_content', content: JSON.stringify(chapContent) }
            ]);

            updateLog(`Capítulo ${chapterNum} salvo.`);

        } catch (err) {
            console.error(`Erro fatal no Cap ${chapterNum}`, err);
            updateLog(`AVISO: Erro no Capítulo ${chapterNum}. O sistema continuará para o próximo.`);
        }
    }

    // -----------------------------------------------------------------------
    // FASE 4: CONCLUSÃO
    // -----------------------------------------------------------------------
    updateLog("Escrevendo Conclusão...");
    const conclContent = await generateSafeContent(ai, buildSectionPrompt('Conclusão', bookContext), sectionContentSchema, updateLog);
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'conclusion', content: JSON.stringify(conclContent) });

    updateLog("Compilando arquivo final...");
    await supabase.from('books').update({ status: 'content_ready' }).eq('id', newBook.id);
    await supabase.from('profiles').update({ book_credits: user.book_credits - 1 }).eq('id', user.id);
    
    updateLog("Processo concluído com sucesso.");
    
    return newBook.id;
};