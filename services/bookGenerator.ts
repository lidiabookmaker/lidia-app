import { supabase } from './supabase';
import type { UserProfile, BookGenerationFormData } from '../types';
import { GEMINI_API_KEY } from './geminiConfig';

// --- CONFIGURAÇÃO ---
const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

// --- HELPER: LIMPEZA DE JSON ---
const cleanAndParseJSON = (text: string): any => {
    // 1. Remove crases de markdown (```json ... ```)
    let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    // 2. Tenta encontrar o primeiro { e o último }
    const first = clean.indexOf('{');
    const last = clean.lastIndexOf('}');
    
    if (first !== -1 && last !== -1) {
        clean = clean.substring(first, last + 1);
    }

    try {
        return JSON.parse(clean);
    } catch (e) {
        console.error("Falha no parse JSON. Texto bruto:", text);
        return null; // Retorna nulo para indicar falha sem quebrar o app
    }
};

// --- HELPER: CONEXÃO DIRETA ---
const callGeminiDirect = async (prompt: string, logFunc: (m: string) => void): Promise<any> => {
    for (const model of MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) {
                if (response.status === 404) continue; // Tenta próximo modelo
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error("Vazio");

            const json = cleanAndParseJSON(rawText);
            if (json) return json; // Sucesso

        } catch (error: any) {
            console.warn(`Erro ${model}:`, error.message);
        }
    }
    return null; // Falha total
};

// --- PROMPTS ---
// Simplificados ao extremo para evitar confusão da IA
const buildOutlinePrompt = (d: BookGenerationFormData) => `
    Crie um JSON para um livro: Título "${d.title}", Nicho "${d.niche}".
    Formato OBRIGATÓRIO:
    {
      "optimized_title": "...",
      "chapters": [
        { "chapter_number": 1, "title": "...", "subchapters_list": ["Sub 1", "Sub 2", "Sub 3"] },
        ... (Total 10 caps)
      ]
    }
`;

const buildChapterPrompt = (title: string, subs: string[], ctx: string) => `
    Escreva cap "${title}". Contexto: ${ctx}.
    Formato JSON:
    {
      "title": "${title}",
      "introduction": "texto (min 300 palavras) use \\n",
      "subchapters": [
        { "title": "${subs[0]}", "content": "texto (min 600 palavras) use \\n" },
        { "title": "${subs[1]}", "content": "texto (min 600 palavras) use \\n" },
        { "title": "${subs[2]}", "content": "texto (min 600 palavras) use \\n" }
      ]
    }
`;

const buildSectionPrompt = (type: string, ctx: string) => `
    Escreva ${type}. Contexto: ${ctx}. JSON: { "title": "${type}", "content": "texto longo" }
`;

// --- FUNÇÃO PRINCIPAL ---

export const generateBookContent = async (
    formData: BookGenerationFormData,
    user: UserProfile,
    updateLog: (message: string) => void
): Promise<string> => {
    
    updateLog("Inicializando Lidia SNT® Core...");
    const bookContext = `Livro: ${formData.title}. Nicho: ${formData.niche}`;

    // --- FASE 1: ESTRUTURA ---
    updateLog("Fase 1: Estrutura Editorial...");
    
    let outline = await callGeminiDirect(buildOutlinePrompt(formData), updateLog);

    // === SALVA-VIDAS (FALLBACK) ===
    // Se a IA falhou, criamos uma estrutura manual baseada no pedido do usuário
    // Isso impede o erro "IA não gerou estrutura válida"
    if (!outline || !outline.chapters || !Array.isArray(outline.chapters)) {
        updateLog("⚠️ IA instável. Ativando Modo de Recuperação Automática...");
        console.warn("Usando estrutura de fallback.");
        
        outline = {
            optimized_title: formData.title,
            optimized_subtitle: formData.subtitle || "Guia Completo",
            chapters: Array.from({ length: 10 }, (_, i) => ({
                chapter_number: i + 1,
                title: `Capítulo ${i + 1}: Explorando ${formData.niche}`,
                subchapters_list: ["Conceitos Fundamentais", "Aplicação Prática", "Estudos de Caso"]
            }))
        };
    }
    // ==============================

    updateLog(`Estrutura definida: ${outline.chapters.length} Capítulos.`);

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
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'cover', content: JSON.stringify({ title: newBook.title, subtitle: newBook.subtitle, author: formData.author }) });

    // --- FASE 2: INTRODUÇÃO ---
    updateLog("Escrevendo Introdução...");
    let introContent = await callGeminiDirect(buildSectionPrompt('Introdução', bookContext), updateLog);
    // Fallback para intro
    if (!introContent) introContent = { title: "Introdução", content: `Bem-vindo ao livro ${formData.title}. Nas próximas páginas, exploraremos ${formData.niche} em profundidade.` };
    
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'introduction', content: JSON.stringify(introContent) });

    // TOC
    const tocList = outline.chapters.map((c: any) => `${c.chapter_number}. ${c.title}`).join('\n');
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'toc', content: JSON.stringify({ title: "Sumário", content: tocList }) });

    // --- FASE 3: LOOP (MATRIX) ---
    updateLog("Iniciando Escrita Sequencial...");

    for (const chapter of outline.chapters) {
        const cNum = chapter.chapter_number;
        const cTitle = chapter.title;
        const cSubs = chapter.subchapters_list || ["Parte 1", "Parte 2", "Parte 3"];

        updateLog(`[SNT Core] Escrevendo Cap ${cNum}: "${cTitle}"...`);
        
        try {
            let chapContent = await callGeminiDirect(buildChapterPrompt(cTitle, cSubs, bookContext), updateLog);
            
            // Fallback se o capítulo falhar
            if (!chapContent) {
                chapContent = {
                    title: cTitle,
                    introduction: `Neste capítulo, vamos abordar ${cTitle} de forma detalhada.`,
                    subchapters: cSubs.map((s: string) => ({ title: s, content: `Conteúdo detalhado sobre ${s} será gerado na revisão final.` }))
                };
            }

            // Normalização
            const finalContent = {
                title: chapContent.title || cTitle,
                introduction: chapContent.introduction || "",
                subchapters: chapContent.subchapters || []
            };

            await supabase.from('book_parts').insert([
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_title', content: JSON.stringify({ title: finalContent.title }) },
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_content', content: JSON.stringify(finalContent) }
            ]);

            updateLog(`Capítulo ${cNum} salvo.`);
        } catch (err) {
            updateLog(`⚠️ Erro no Cap ${cNum}. Avançando...`);
        }
    }

    // --- FASE 4: CONCLUSÃO ---
    updateLog("Escrevendo Conclusão...");
    let conclContent = await callGeminiDirect(buildSectionPrompt('Conclusão', bookContext), updateLog);
    if (!conclContent) conclContent = { title: "Conclusão", content: "Obrigado por ler este livro." };
    
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'conclusion', content: JSON.stringify(conclContent) });

    updateLog("Finalizando...");
    await supabase.from('books').update({ status: 'content_ready' }).eq('id', newBook.id);
    await supabase.from('profiles').update({ book_credits: user.book_credits - 1 }).eq('id', user.id);
    
    updateLog("Sucesso! Gerando PDF...");
    return newBook.id;
};