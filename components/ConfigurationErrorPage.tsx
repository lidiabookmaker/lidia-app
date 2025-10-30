import React from 'react';
import { Card } from './ui/Card';

interface ConfigurationErrorPageProps {
  missingKeys: ('supabase')[];
}

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="bg-gray-200 text-red-700 font-mono p-1 rounded text-sm">
    {children}
  </code>
);

export const ConfigurationErrorPage: React.FC<ConfigurationErrorPageProps> = ({ missingKeys }) => {
  return (
    <div className="min-h-screen bg-red-50 flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-2xl border-2 border-red-300">
        <h1 className="text-2xl font-bold text-red-800 mb-4">
          Erro de Configuração Crítico
        </h1>
        <p className="text-gray-700 mb-6">
          A aplicação não pode iniciar porque uma ou mais chaves de API essenciais não foram configuradas.
          Para resolver isso, por favor edite os seguintes arquivos no seu código:
        </p>
        <div className="space-y-4">
          {missingKeys.includes('supabase') && (
            <div className="bg-red-100 p-4 rounded-lg">
              <h2 className="font-semibold text-red-900">Credenciais do Supabase Faltando</h2>
              <p className="mt-1 text-gray-800">
                Por favor, adicione sua URL e Chave Anon do Supabase no arquivo:{' '}
                <CodeBlock>services/supabaseConfig.ts</CodeBlock>
              </p>
            </div>
          )}
        </div>
        <p className="mt-6 text-sm text-gray-600">
          Após adicionar as chaves e salvar os arquivos, a aplicação irá funcionar corretamente.
          Esta é uma medida de segurança para a fase de MVP, para garantir que você não se esqueça de configurar as chaves.
        </p>
      </Card>
    </div>
  );
};
