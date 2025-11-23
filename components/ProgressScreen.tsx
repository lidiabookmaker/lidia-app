import React, { useEffect, useRef } from 'react';

// Ícones SVG Simples
const IconTerminal = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
);

const IconCheckCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

interface ProgressScreenProps {
  logs: string[];
  isDone: boolean;
  onComplete: () => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ logs, isDone, onComplete }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll sempre que chegar um log novo
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black font-mono">
      
      {/* Container do Terminal */}
      <div className="w-full max-w-5xl h-full md:h-[90vh] bg-gray-950 md:rounded-lg shadow-2xl flex flex-col border border-gray-800 overflow-hidden relative">
        
        {/* Barra de Título do Terminal */}
        <div className="bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-800">
            <div className="flex items-center gap-2 text-gray-400">
                <IconTerminal className="w-4 h-4" />
                <span className="text-sm font-bold tracking-wider">LIDIA_CORE_TERMINAL_V2.5</span>
            </div>
            <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            </div>
        </div>

        {/* Área de Logs (Scrollável) */}
        <div 
            ref={scrollRef} 
            className="flex-1 p-6 overflow-y-auto space-y-2 text-sm md:text-base scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent"
        >
            {/* Mensagem Inicial Fixa */}
            <div className="text-gray-500 mb-4">
                {">"} Initializing system...<br/>
                {">"} Loading modules: WEASYPRINT, GEMINI_PRO, SNT_CORE... [OK]<br/>
                {">"} Connected to secure server.<br/>
                {">"} Awaiting instructions...
            </div>

            {/* Logs Dinâmicos Reais */}
            {logs.map((log, index) => {
                // Destacar logs de erro ou sucesso
                const isError = log.includes("ERRO");
                const isSuccess = log.includes("sucesso") || log.includes("finalizado");
                
                return (
                    <div key={index} className={`break-words ${isError ? 'text-red-500' : isSuccess ? 'text-green-300 font-bold' : 'text-green-500'}`}>
                        <span className="opacity-50 mr-2">{">"}</span>
                        {log}
                    </div>
                );
            })}

            {/* Cursor Piscante (Só aparece se NÃO acabou) */}
            {!isDone && (
                <div className="animate-pulse text-green-500 mt-2">_</div>
            )}

            {/* Espaço extra no final para o scroll não ficar colado */}
            <div className="h-20"></div>
        </div>

        {/* Painel de Sucesso (Aparece embaixo quando termina) */}
        {isDone && (
            <div className="bg-gray-900 border-t border-gray-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-slide-up">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-900/30 rounded-full border border-green-500/30">
                        <IconCheckCircle className="text-green-400 w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg">Livro Gerado com Sucesso</h3>
                        <p className="text-gray-400 text-sm">O arquivo PDF está pronto para visualização e download.</p>
                    </div>
                </div>
                
                <button 
                    onClick={onComplete}
                    className="w-full md:w-auto px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                >
                    Acessar Dashboard
                </button>
            </div>
        )}

      </div>

      {/* CSS para animação de entrada do painel final */}
      <style>{`
        @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
            animation: slideUp 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};