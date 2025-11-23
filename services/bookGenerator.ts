import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from './supabase';
import type { UserProfile, BookGenerationFormData } from '../types';
import { GEMINI_API_KEY, OPENAI_API_KEY } from './geminiConfig';

// --- TIPOS E SCHEMAS ---

const outlineSchema = {
    type: Type.OBJECT,
    properties: {
        optimized_title: { type: Type.STRING },
        optimized_subtitle: { type: Type.STRING },
        introduction_outline: { type: Type.STRING },
        chapters: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    chapter_number: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    subchapters_list: { 
                        type: Type.ARRAY, items: { type: Type.STRING } 
                    }
                },
                required: ['chapter_number', 'title', 'subchapters_list']
            }
        },
        conclusion_outline: { type: Type.STRING }
    },
    required: ['optimized_title', 'optimized_subtitle', 'chapters']
};

// --- PROMPTS BUILDERS ---

const buildOutlinePrompt = (formData: BookGenerationFormData): string => {
    return `
      Atue como um Arquiteto Editorial. Planeje a estrutura de um livro.
      Dados: Título="${formData.title}", Nicho="${formData.niche}", Público="${formData.tone}", Resumo="${formData.summary}".
      Requisitos:
      1. Otimize Título e Subtítulo.
      2. Crie EXATAMENTE 10 CAPÍTULOS lógicos.
      3. Defina 3 subcapítulos para cada.
      IMPORTANTE: Responda estritamente com o JSON solicitado.
    `;
};

const buildChapterPrompt = (chapterTitle: string, subchapters: string[], context: string): string => {
    return `
      Escreva o capítulo: "${chapterTitle}".
      Contexto: ${context}
      Estrutura:
      - Intro (min 300 palavras).
      - Subcapítulo 1: "${subchapters[0]}" (min 600 palavras).
      - Subcapítulo 2: "${subchapters[1]}" (min 600 palavras).
      - Subcapítulo 3: "${subchapters[2]}" (min 600 palavras).
      Regras: Use parágrafos curtos com \\n.
      Responda estritamente com o JSON.
    `;
};

const buildSectionPrompt = (sectionType: string, context: string): string => {
    return `Escreva a ${sectionType} completa (min 600 palavras). Contexto: ${context}. Responda estritamente com o JSON.`;
};


// --- MOTOR OPENAI (FALLBACK DE EMERGÊNCIA) ---
// Usa fetch nativo para não precisar instalar SDKs novos agora
const callOpenAIFallback = async (prompt: string, logFunc: (msg: string) => void) => {
    if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 10) {
        throw new Error("OpenAI API Key não configurada.");
    }

    logFunc("🔄 Ativando Motor Auxiliar (OpenAI GPT-4o-mini)...");

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // Muito barato e inteligente
                messages: [
                    { role: "system", content: "Você é um assistente editorial especializado que responde EXCLUSIVAMENTE em JSON válido." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }, // Força JSON
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Erro OpenAI: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const rawContent = data.choices[0].message.content;
        return JSON.parse(rawContent);

    } catch (error: any) {
        console.error("Erro OpenAI:", error);
        throw new Error(`Falha no Motor Auxiliar: ${error.message}`);
    }
};


// --- MOTOR HÍBRIDO (TRY GOOGLE -> CATCH -> OPENAI) ---

const generateHybridContent = async (
    ai: GoogleGenAI, 
    prompt: string, 
    schema: any, 
    logFunc: (msg: string) => void
): Promise<any> => {
    
    // 1. Tentar Gemini (Google)
    const googleModels = ['gemini-1.5-flash', 'gemini-1.5-pro']; // Flash primeiro pois é mais estável na v1beta
    
    for (const model of googleModels) {
        try {
            // console.log(`Tentando Google ${model}...`);
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: schema }
            });
            return JSON.parse(response.text.trim());
        } catch (error: any) {
            console.warn(`Google ${model} falhou.`);
        }
    }

    // 2. Se tudo do Google falhar, chamar OpenAI
    return await callOpenAIFallback(prompt, logFunc);
};


// --- FUNÇÃO PRINCIPAL ---

export const generateBookContent = async (
    formData: BookGenerationFormData,
    user: UserProfile,
    updateLog: (message: string) => void
): Promise<string> => {
    
    updateLog("Inicializando Lidia SNT® Core (Hybrid Engine)...");
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const bookContext = `Livro: ${formData.title}. Nicho: ${formData.niche}. Objetivo: ${formData.summary}`;

    // --- FASE 1: ESTRUTURA ---
    updateLog("Fase 1: Blueprint Editorial...");
    
    // Schema manual para OpenAI (pois ele não lê o objeto Type do Google)
    // O prompt já pede JSON, então o gpt-4o-mini vai entender
    const outline = await generateHybridContent(ai, buildOutlinePrompt(formData), outlineSchema, updateLog);
    
    // Validação básica
    const title = outline.optimized_title || formData.title;
    const subtitle = outline.optimized_subtitle || formData.subtitle;
    const chapters = outline.chapters || [];

    updateLog(`Estrutura definida: ${chapters.length} Capítulos.`);

    // Cria Livro no Banco
    const { data: newBook, error: bookError } = await supabase
        .from('books')
        .insert({
            user_id: user.id,
            title: title,
            subtitle: subtitle,
            author: formData.author,
            status: 'processing_parts',
        })
        .select()
        .single();
    
    if (bookError) {
        updateLog("Erro crítico ao salvar no banco.");
        throw bookError;
    }

    let partIndex = 1;
    await supabase.from('book_parts').insert([
        { book_id: newBook.id, part_index: partIndex++, part_type: 'cover', content: JSON.stringify({ title, subtitle, author: formData.author }) },
        { book_id: newBook.id, part_index: partIndex++, part_type: 'copyright', content: JSON.stringify(`Copyright © ${new Date().getFullYear()} ${formData.author}`) }
    ]);

    // --- FASE 2: INTRODUÇÃO ---
    updateLog("Escrevendo Introdução...");
    const introContent = await generateHybridContent(ai, buildSectionPrompt('Introdução', bookContext), null, updateLog);
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'introduction', content: JSON.stringify(introContent) });

    // Salva TOC
    const tocContent = { title: "Sumário", content: chapters.map((c: any) => `${c.chapter_number}. ${c.title}`).join('\n') };
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'toc', content: JSON.stringify(tocContent) });

    // --- FASE 3: LOOP MATRIX ---
    updateLog("Iniciando Motor de Escrita Sequencial...");

    for (const chapter of chapters) {
        const chapterNum = chapter.chapter_number || 1;
        const chapterTitle = chapter.title || "Capítulo";
        const subchapters = chapter.subchapters_list || ["Parte 1", "Parte 2", "Parte 3"];

        updateLog(`[SNT Core] Escrevendo Cap ${chapterNum}: "${chapterTitle}"...`);
        
        try {
            const chapContent = await generateHybridContent(
                ai, 
                buildChapterPrompt(chapterTitle, subchapters, bookContext), 
                null, // OpenAI não precisa do schema do Google aqui
                updateLog
            );

            // Garante formato correto
            const contentToSave = {
                title: chapContent.title || chapterTitle,
                introduction: chapContent.introduction || "",
                subchapters: chapContent.subchapters || []
            };

            await supabase.from('book_parts').insert([
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_title', content: JSON.stringify({ title: contentToSave.title }) },
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_content', content: JSON.stringify(contentToSave) }
            ]);

            updateLog(`Capítulo ${chapterNum} salvo.`);

        } catch (err) {
            console.error(`Erro cap ${chapterNum}`, err);
            updateLog(`Aviso: Instabilidade no Cap ${chapterNum}. Pulando...`);
        }
    }

    // --- FASE 4: CONCLUSÃO ---
    updateLog("Escrevendo Conclusão...");
    const conclContent = await generateHybridContent(ai, buildSectionPrompt('Conclusão', bookContext), null, updateLog);
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'conclusion', content: JSON.stringify(conclContent) });

    updateLog("Finalizando...");
    await supabase.from('books').update({ status: 'content_ready' }).eq('id', newBook.id);
    await supabase.from('profiles').update({ book_credits: user.book_credits - 1 }).eq('id', user.id);
    
    updateLog("Sucesso! Gerando PDF...");
    
    return newBook.id;
};