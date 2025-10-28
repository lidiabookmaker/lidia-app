// This file declares the types for environment variables accessed via process.env.
// This provides type safety for the variables injected by the execution environment.

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_ANON_KEY?: string;
      API_KEY?: string;
    }
  }
}

// This export statement is necessary to make this file a module.
export {};
