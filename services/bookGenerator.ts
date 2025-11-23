import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from './supabase';
import type { UserProfile, BookGenerationFormData } from '../types';
import { GEMINI_API_KEY } from './geminiConfig';

// --- CONFIGURAÇÃO DO MODELO ---
const MODEL_NAME = "gemini-1.5-flash";

// --- TIPOS DE RESPOSTA (JSON SCHEMAS CORRIGIDOS PARA 'Type') ---

const outlineSchema = {
    type: Type.OBJECT,
    properties: {
        optimized_title: { type: Type.STRING },
        optimized_subtitle: { type: Type.STRING },
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
        }
    },
    required: ['optimized_title', 'optimized_subtitle', 'chapters']
};

const chapterContentSchema = {
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
                    content: { type: Type.STRING }
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
        content: { type: Type.STRING }
    },
    required: ['title', 'content']
};

// --- PROMPTS ---

const buildOutlinePrompt = (formData: BookGenerationFormData) => `
  Atue como Editor Chefe. Crie o planejamento de um livro.
  Dados: Título="${formData.title}", Nicho="${formData.niche}", Tom="${formData.tone}", Objetivo="${formData.summary}".
  Requisitos:
  1. Título e Subtítulo otimizados.
  2. EXATAMENTE 10 Capítulos.
  3. 3 Subcapítulos por capítulo.
  Responda APENAS JSON.
`;

const buildChapterPrompt = (title: string, subs: string[], ctx: string) => `
  Escreva o capítulo "${title}".
  Contexto do Livro: ${ctx}
  Estrutura:
  - Intro (min 300 palavras).
  - Subcapítulo 1: "${subs[0]}" (min 600 palavras).
  - Subcapítulo 2: "${subs[1]}" (min 600 palavras).
  - Subcapítulo 3: "${subs[2]}" (min 600 palavras).
  Regras: Parágrafos curtos, fluidez, use \\n.
`;

const buildSectionPrompt = (type: string, ctx: string) => `
  Escreva a ${type} (min 600 palavras). Contexto: ${ctx}.
`;

// --- FUNÇÃO PRINCIPAL ---

export const generateBookContent = async (
    formData: BookGenerationFormData,
    user: UserProfile,
    updateLog: (message: string) => void
): Promise<string> => {
    
    updateLog("Inicializando Lidia SNT® Core (SDK Nativo)...");
    
    // Inicializa o SDK Oficial
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const bookContext = `Livro: ${formData.title}. Nicho: ${formData.niche}`;

    // --- FASE 1: ESTRUTURA ---
    updateLog("Fase 1: Criando Estrutura Editorial...");
    
    try {
        const outlineRes = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: buildOutlinePrompt(formData),
            config: { responseMimeType: "application/json", responseSchema: outlineSchema }
        });

        // Parse seguro
        const outlineText = outlineRes.text();
        if (!outlineText) throw new Error("IA retornou vazio.");
        const outline = JSON.parse(outlineText);

        updateLog(`Estrutura definida: ${outline.chapters.length} Capítulos.`);

        // Salva Livro no Banco
        const { data: newBook, error: bookError } = await supabase
            .from('books')
            .insert({
                user_id: user.id,
                title: outline.optimized_title || formData.title,
                subtitle: outline.optimized_subtitle || formData.subtitle,
                author: formData.author,
                status: 'processing_parts',
            })
            .select()
            .single();

        if (bookError) throw bookError;

        let partIndex = 1;
        // Salva Capa
        await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'cover', content: JSON.stringify({ title: newBook.title, subtitle: newBook.subtitle, author: formData.author }) });

        // --- FASE 2: INTRODUÇÃO ---
        updateLog("Escrevendo Introdução...");
        const introRes = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: buildSectionPrompt('Introdução', bookContext),
            config: { responseMimeType: "application/json", responseSchema: sectionContentSchema }
        });
        const introContent = JSON.parse(introRes.text() || "{}");
        await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'introduction', content: JSON.stringify(introContent) });

        // Salva Sumário (TOC)
        const tocList = outline.chapters.map((c: any) => `${c.chapter_number}. ${c.title}`).join('\n');
        await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'toc', content: JSON.stringify({ title: "Sumário", content: tocList }) });

        // --- FASE 3: LOOP MATRIX ---
        updateLog("Iniciando Escrita Sequencial dos Capítulos...");

        for (const chapter of outline.chapters) {
            const cNum = chapter.chapter_number;
            const cTitle = chapter.title;
            const cSubs = chapter.subchapters_list || [];

            updateLog(`[SNT Core] Escrevendo Cap ${cNum}: "${cTitle}"...`);
            
            try {
                const chapRes = await ai.models.generateContent({
                    model: MODEL_NAME,
                    contents: buildChapterPrompt(cTitle, cSubs, bookContext),
                    config: { responseMimeType: "application/json", responseSchema: chapterContentSchema }
                });
                
                const chapContent = JSON.parse(chapRes.text() || "{}");

                // Garante integridade dos dados
                const finalContent = {
                    title: chapContent.title || cTitle,
                    introduction: chapContent.introduction || "",
                    subchapters: chapContent.subchapters || []
                };

                await supabase.from('book_parts').insert([
                    { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_title', content: JSON.stringify({ title: finalContent.title }) },
                    { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_content', content: JSON.stringify(finalContent) }
                ]);

                updateLog(`Capítulo ${cNum} finalizado.`);

            } catch (err) {
                console.error(`Erro cap ${cNum}`, err);
                updateLog(`⚠️ Erro ao gerar Cap ${cNum}. O sistema avançará.`);
            }
        }

        // --- FASE 4: CONCLUSÃO ---
        updateLog("Escrevendo Conclusão...");
        const conclRes = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: buildSectionPrompt('Conclusão', bookContext),
            config: { responseMimeType: "application/json", responseSchema: sectionContentSchema }
        });
        const conclContent = JSON.parse(conclRes.text() || "{}");
        await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'conclusion', content: JSON.stringify(conclContent) });

        // Finaliza
        updateLog("Finalizando...");
        await supabase.from('books').update({ status: 'content_ready' }).eq('id', newBook.id);
        await supabase.from('profiles').update({ book_credits: user.book_credits - 1 }).eq('id', user.id);
        
        updateLog("Sucesso! Livro gerado.");
        return newBook.id;

    } catch (fatalError: any) {
        console.error("Erro Fatal:", fatalError);
        throw new Error(`Falha crítica na IA: ${fatalError.message}`);
    }
};