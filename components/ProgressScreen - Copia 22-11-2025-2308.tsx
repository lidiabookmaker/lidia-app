import React, { useEffect, useState } from 'react';

// --- ÍCONES SVG NATIVOS (Para não depender de 'lucide-react') ---
const IconBookOpen = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const IconCpu = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 1v3" /><path d="M15 1v3" /><path d="M9 20v3" /><path d="M15 20v3" />
    <path d="M20 9h3" /><path d="M20 14h3" /><path d="M1 9h3" /><path d="M1 14h3" />
  </svg>
);

interface ProgressScreenProps {
  logs: string[];
  currentStep?: string; // Tornei opcional para compatibilidade, mas usamos ele se vier
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ logs, currentStep }) => {
  // Prioriza o currentStep passado via prop, senão pega do array de logs
  const lastLog = currentStep || (logs.length > 0 ? logs[logs.length - 1] : "Iniciando conexão com o núcleo...");
  
  // Remove timestamp [HH:MM:SS] para limpar a visualização
  const cleanMessage = lastLog.replace(/^\[.*?\]\s*/, '').trim();

  const [progress, setProgress] = useState(0);

  // Efeito da barra de progresso "fake" para dar sensação de atividade
  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        // Vai até 95% e espera o próximo log
        if (prev >= 95) return prev; 
        return prev + Math.random() * 2; // Velocidade variável
      });
    }, 100);

    return () => clearInterval(interval);
  }, [lastLog]); 

  return (
    // Z-INDEX alto e FIXED para cobrir toda a tela (Cinema Mode Real)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950 text-white">
      
      {/* --- FUNDO ANIMADO (Aurora Boreal) --- */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(79,70,229,0.15)_0%,rgba(0,0,0,0)_50%)] animate-pulse"></div>
        <div className="absolute bottom-[-50%] right-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(147,51,234,0.15)_0%,rgba(0,0,0,0)_50%)] animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl p-8 flex flex-col items-center justify-center space-y-10">
        
        {/* --- LOGO E CORE --- */}
        <div className="flex flex-col items-center space-y-6">
          <div className="bg-white/5 p-6 rounded-full backdrop-blur-md border border-indigo-500/20 shadow-[0_0_30px_rgba(79,70,229,0.3)] animate-pulse">
            <IconBookOpen className="text-indigo-400" />
          </div>
          
          <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-950/80 rounded-full border border-indigo-500/30 shadow-lg">
            <IconCpu className="text-cyan-400 animate-pulse" />
            <span className="text-xs font-mono tracking-widest text-cyan-300 uppercase">
              Lidia AI Core Active
            </span>
          </div>
        </div>

        {/* --- TEXTO DA MENSAGEM --- */}
        <div className="w-full min-h-[80px] flex items-center justify-center">
          <h2 className="text-2xl md:text-3xl font-light text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-indigo-200">
            {cleanMessage}
            <span className="inline-flex ml-1 w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="inline-flex ml-1 w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="inline-flex ml-1 w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </h2>
        </div>

        {/* --- BARRA DE PROGRESSO --- */}
        <div className="w-full max-w-xl space-y-3">
          <div className="flex justify-between text-xs text-indigo-300/70 uppercase tracking-wider font-mono">
            <span>Progresso da Etapa</span>
            <span>{Math.round(progress)}%</span>
          </div>
          
          <div className="h-1.5 w-full bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-cyan-400 transition-all duration-300 ease-out relative shadow-[0_0_10px_rgba(168,85,247,0.5)]"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>
          
          <p className="text-xs text-center text-gray-500 mt-4 max-w-md mx-auto leading-relaxed">
            A IA está estruturando capítulos, escrevendo conteúdo e formatando seu PDF. 
            <br/><span className="text-indigo-400/80">Por favor, não feche esta aba.</span>
          </p>
        </div>

      </div>
    </div>
  );
};
``