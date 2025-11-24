import { supabase } from './supabase';
import type { UserProfile, BookGenerationFormData } from '../types';
import { GEMINI_API_KEY } from './geminiConfig';

// --- CONFIGURAÇÃO ---
// Tenta o Flash (rápido) e depois o Pro (estável) e o Pro 1.0 (Legacy)
const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

// --- HELPER: LIMPEZA CIRÚRGICA DE JSON ---
const cleanAndParseJSON = (text: string): any => {
    try {
        // 1. Tenta parse direto
        return JSON.parse(text);
    } catch (e) {
        // 2. Se falhar, tenta extrair o primeiro bloco JSON válido encontrado no texto
        // Procura pelo primeiro '{' e o último '}'
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1) {
            const jsonCandidate = text.substring(firstOpen, lastClose + 1);
            try {
                return JSON.parse(jsonCandidate);
            } catch (e2) {
                // Continua falhando...
            }
        }
        throw new Error("A resposta da IA não contém um JSON válido.");
    }
};

// --- HELPER: CONEXÃO HTTP DIRETA ---
const callGeminiDirect = async (prompt: string, logFunc: (m: string) => void): Promise<any> => {
    
    let lastErrorDetails = "";

    for (const model of MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

        const body = {
            contents: [{ parts: [{ text: prompt }] }],
            // Configurações de segurança para evitar bloqueios de conteúdo inofensivo
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                if (response.status === 404) {
                    // console.warn(`Modelo ${model} off (404).`);
                    continue; // Tenta o próximo silenciosamente
                }
                const errText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errText}`);
            }

            const data = await response.json();
            
            // Verifica se houve bloqueio de segurança
            if (data.promptFeedback?.blockReason) {
                throw new Error(`Bloqueio de Segurança Google: ${data.promptFeedback.blockReason}`);
            }

            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error("Resposta vazia da IA (Candidate nulo).");

            // Usa o limpador cirúrgico
            const finalJSON = cleanAndParseJSON(rawText);
            return finalJSON;

        } catch (error: any) {
            console.warn(`Erro no modelo ${model}:`, error.message);
            lastErrorDetails = error.message;
            // Se foi o último modelo, falha de vez
            if (model === MODELS[MODELS.length - 1]) {
                throw new Error(`Falha na IA: ${lastErrorDetails}`);
            }
        }
    }
};

// --- PROMPTS (Reforçando JSON puro) ---

const buildOutlinePrompt = (formData: BookGenerationFormData) => `
  Atue como Editor Chefe.
  Livro: "${formData.title}" (${formData.niche}). Resumo: ${formData.summary}.
  
  Tarefa: Crie a estrutura JSON abaixo. Não use markdown. Não converse.
  {
    "optimized_title": "...",
    "optimized_subtitle": "...",
    "chapters": [
      { "chapter_number": 1, "title": "...", "subchapters_list": ["Sub 1", "Sub 2", "Sub 3"] }
    ]
  }
  Requisito: Exatamente 10 capítulos.
`;

const buildChapterPrompt = (title: string, subs: string[], ctx: string) => `
  Escreva o capítulo "${title}". Contexto: ${ctx}.
  Tarefa: Responda APENAS com este JSON preenchido:
  {
    "title": "${title}",
    "introduction": "texto longo com \\n",
    "subchapters": [
      { "title": "${subs[0]}", "content": "texto longo com \\n" },
      { "title": "${subs[1]}", "content": "texto longo com \\n" },
      { "title": "${subs[2]}", "content": "texto longo com \\n" }
    ]
  }
`;

const buildSectionPrompt = (type: string, ctx: string) => `
  Escreva a ${type} (min 600 palavras). Contexto: ${ctx}.
  Tarefa: Responda APENAS com este JSON:
  { "title": "${type}", "content": "texto longo com \\n" }
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
    
    // Chama a IA
    const outline = await callGeminiDirect(buildOutlinePrompt(formData), updateLog);
    
    // VALIDAÇÃO CRÍTICA: Se a IA não devolveu chapters, falha aqui com mensagem clara
    if (!outline || !outline.chapters || !Array.isArray(outline.chapters)) {
        console.error("JSON Inválido recebido:", outline);
        throw new Error("A IA não gerou uma estrutura válida. Tente novamente.");
    }

    updateLog(`Estrutura definida: ${outline.chapters.length} Capítulos.`);

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
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'cover', content: JSON.stringify({ title: newBook.title, subtitle: newBook.subtitle, author: formData.author }) });

    // --- FASE 2: INTRODUÇÃO ---
    updateLog("Escrevendo Introdução...");
    const introContent = await callGeminiDirect(buildSectionPrompt('Introdução', bookContext), updateLog);
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'introduction', content: JSON.stringify(introContent) });

    // Salva Sumário
    const tocList = outline.chapters.map((c: any) => `${c.chapter_number}. ${c.title}`).join('\n');
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'toc', content: JSON.stringify({ title: "Sumário", content: tocList }) });

    // --- FASE 3: LOOP ---
    updateLog("Iniciando Escrita Sequencial...");

    for (const chapter of outline.chapters) {
        const cNum = chapter.chapter_number;
        
        updateLog(`[SNT Core] Escrevendo Cap ${cNum}: "${chapter.title}"...`);
        
        try {
            const chapContent = await callGeminiDirect(buildChapterPrompt(chapter.title, chapter.subchapters_list, bookContext), updateLog);
            
            const finalContent = {
                title: chapContent.title || chapter.title,
                introduction: chapContent.introduction || "",
                subchapters: chapContent.subchapters || []
            };

            await supabase.from('book_parts').insert([
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_title', content: JSON.stringify({ title: finalContent.title }) },
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_content', content: JSON.stringify(finalContent) }
            ]);

            updateLog(`Capítulo ${cNum} salvo.`);
        } catch (err) {
            console.error(err);
            updateLog(`⚠️ Erro no Cap ${cNum}. Avançando...`);
        }
    }

    // --- FASE 4: CONCLUSÃO ---
    updateLog("Escrevendo Conclusão...");
    const conclContent = await callGeminiDirect(buildSectionPrompt('Conclusão', bookContext), updateLog);
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'conclusion', content: JSON.stringify(conclContent) });

    updateLog("Finalizando...");
    await supabase.from('books').update({ status: 'content_ready' }).eq('id', newBook.id);
    await supabase.from('profiles').update({ book_credits: user.book_credits - 1 }).eq('id', user.id);
    
    updateLog("Sucesso! Gerando PDF...");
    return newBook.id;
};