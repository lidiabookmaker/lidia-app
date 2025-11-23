import React, { useEffect, useState } from 'react';

// --- DATA: 56 ETAPAS DA LIDIA ---
const GENERATION_STEPS = [
    {id:1, label:"Iniciando Lídia com SNT Core Inside."},
    {id:2, label:"Enviando instruções para geração do livro com Lídia."},
    {id:3, label:"Gerando blueprint editorial (10 capítulos + subcapítulos)."},
    {id:4, label:"Calibrando tom de voz e idioma."},
    {id:5, label:"Criando tópicos e objetivos de cada capítulo."},
    {id:6, label:"Definindo título e subtítulo finais."},
    {id:7, label:"Escolhendo autor e metadados de publicação."},
    {id:8, label:"Montando outline detalhado por capítulo."},
    {id:9, label:"Gerando conteúdo do Capítulo 1."},
    {id:10, label:"Gerando conteúdo do Capítulo 2."},
    {id:11, label:"Gerando conteúdo do Capítulo 3."},
    {id:12, label:"Gerando conteúdo do Capítulo 4."},
    {id:13, label:"Gerando conteúdo do Capítulo 5."},
    {id:14, label:"Gerando conteúdo do Capítulo 6."},
    {id:15, label:"Gerando conteúdo do Capítulo 7."},
    {id:16, label:"Gerando conteúdo do Capítulo 8."},
    {id:17, label:"Gerando conteúdo do Capítulo 9."},
    {id:18, label:"Gerando conteúdo do Capítulo 10."},
    {id:19, label:"Desenvolvendo as 3 seções de cada capítulo."},
    {id:20, label:"Revisando coerência entre capítulos."},
    {id:21, label:"Aprimorando transições e fluidez narrativa."},
    {id:22, label:"Gerando conclusão e mensagem final."},
    {id:23, label:"Extraindo citações e chamadas à ação."},
    {id:24, label:"Ajustando densidade de palavras (22.800 palavras alvo)."},
    {id:25, label:"Aplicando voz do autor e consistência estilística."},
    {id:26, label:"Gerando título alternativos para teste A/B."},
    {id:27, label:"Criando a paleta de cores e opções de capa."},
    {id:28, label:"Montando prompt para o Cover Creator."},
    {id:29, label:"Gerando capa exclusiva (versão 1)."},
    {id:30, label:"Gerando capa exclusiva (variante 2)."},
    {id:31, label:"Selecionando a melhor composição de capa."},
    {id:32, label:"Renderizando arquivo de capa A5 final."},
    {id:33, label:"Inserindo capa no template do livro."},
    {id:34, label:"Formatando cabeçalhos e rodapés."},
    {id:35, label:"Gerando sumário com numeração automática."},
    {id:36, label:"Aplicando estilos tipográficos e espaçamento."},
    {id:37, label:"Ajustando margens e layout A5."},
    {id:38, label:"Checando quebras e viúvas/órfãs."},
    {id:39, label:"Inserindo numeração de páginas."},
    {id:40, label:"Validando links internos e referências."},
    {id:41, label:"Otimização final do HTML para WeasyPrint."},
    {id:42, label:"Renderização do PDF (WeasyPrint)."},
    {id:43, label:"Verificando qualidade do PDF gerado."},
    {id:44, label:"Compressão e otimização do arquivo."},
    {id:45, label:"Enviando PDF ao armazenamento (Supabase Storage)."},
    {id:46, label:"Gerando metadados finais e checksum."},
    {id:47, label:"Criando URL segura para download."},
    {id:48, label:"Preparando miniatura e preview do PDF."},
    {id:49, label:"Atualizando estado do job no Supabase."},
    {id:50, label:"Executando checks finais de consistência editorial."},
    {id:51, label:"Integrando capa, sumário e metadados no pacote."},
    {id:52, label:"Rodando validação de legibilidade automática."},
    {id:53, label:"Gerando relatório resumido para o usuário."},
    {id:54, label:"Preparando notificação e badge de conclusão."},
    {id:55, label:"Sincronizando logs e métricas (SNT Core)."},
    {id:56, label:"Finalizando: limpando processos e liberando download."}
];

// --- ÍCONES SVG ---
const IconBookOpen = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
);
const IconCpu = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 1v3" /><path d="M15 1v3" /><path d="M9 20v3" /><path d="M15 20v3" /><path d="M20 9h3" /><path d="M20 14h3" /><path d="M1 9h3" /><path d="M1 14h3" /></svg>
);
const IconCheck = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const IconDownload = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

interface ProgressScreenProps {
  logs: string[]; // Ainda recebemos para debug se precisar, mas a UI usa os steps fixos
  isDone: boolean; // Flag que indica se o backend terminou
  onComplete: () => void; // Função para sair da tela
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ logs, isDone, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFinishedAnimation, setIsFinishedAnimation] = useState(false);

  const currentStep = GENERATION_STEPS[currentStepIndex];

  useEffect(() => {
    // Se já acabou a animação inteira, não faz nada
    if (isFinishedAnimation) return;

    let intervalTime = 30; // Tempo padrão do "tick" da barra
    let stepIncrement = 0.5; // Quanto a barra anda por tick

    // MODO TURBO: Se o backend acabou (isDone), aceleramos absurdamente
    if (isDone) {
        intervalTime = 5; 
        stepIncrement = 5; 
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Terminou o passo atual
          if (currentStepIndex < GENERATION_STEPS.length - 1) {
            // Avança para o próximo passo
            setCurrentStepIndex(old => old + 1);
            return 0;
          } else {
            // Chegou no último passo (56)
            setIsFinishedAnimation(true);
            return 100;
          }
        }
        // Continua enchendo a barra
        return prev + stepIncrement;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [currentStepIndex, isDone, isFinishedAnimation]);

  // --- TELA DE SUCESSO FINAL ---
  if (isFinishedAnimation) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 text-white">
             {/* Fundo Aurora */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(79,70,229,0.2)_0%,rgba(0,0,0,0)_60%)] animate-pulse"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center p-8 animate-fade-in-up">
                <div className="mb-8 p-6 rounded-full bg-green-500/20 border border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.4)]">
                    <IconCheck className="text-green-400" />
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                    Seu livro está pronto!
                </h1>
                <p className="text-xl text-indigo-200 mb-10 max-w-md">
                    A Lidia finalizou a escrita e a formatação. Ficou com cara de estúdio profissional.
                </p>

                <button 
                    onClick={onComplete}
                    className="group relative px-8 py-4 bg-white text-indigo-900 font-bold text-lg rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform duration-300 flex items-center gap-3"
                >
                    <IconDownload className="w-6 h-6" />
                    Baixar PDF e Visualizar
                    <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-20"></div>
                </button>
            </div>
        </div>
    );
  }

  // --- TELA DE HIPNOSE (ETAPAS) ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950 text-white font-mono">
      
      {/* Fundo Aurora */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(79,70,229,0.15)_0%,rgba(0,0,0,0)_50%)] animate-pulse"></div>
        <div className="absolute bottom-[-50%] right-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(147,51,234,0.15)_0%,rgba(0,0,0,0)_50%)] animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-3xl p-8 flex flex-col items-center justify-center space-y-12">
        
        {/* Cabeçalho SNT */}
        <div className="flex flex-col items-center gap-4 opacity-80">
            <IconBookOpen className="text-indigo-400/50 w-12 h-12" />
            <div className="flex items-center gap-2 text-xs tracking-[0.2em] text-cyan-400 uppercase border border-cyan-900/50 px-3 py-1 rounded-full bg-cyan-950/30">
                <IconCpu className="w-3 h-3 animate-pulse" />
                SNT® Core Processing
            </div>
        </div>

        {/* Mensagem Principal (Etapa Atual) */}
        <div className="h-32 flex items-center justify-center w-full">
             {/* Key na DIV força a animação a reiniciar quando o texto muda */}
            <h2 key={currentStep.id} className="text-2xl md:text-3xl text-center font-light leading-relaxed animate-[fadeIn_0.5s_ease-out]">
                {currentStep.label}
            </h2>
        </div>

        {/* Barra de Progresso da Etapa */}
        <div className="w-full max-w-xl space-y-2">
            <div className="flex justify-between text-xs text-indigo-400/60 uppercase">
                <span>Etapa {currentStep.id} de {GENERATION_STEPS.length}</span>
                <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-75 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>

      </div>
      
      {/* CSS Inline para animação de entrada de texto */}
      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};