// Define types for `process.env` used by Supabase and the Gemini API Key.
// This standardizes environment variable access for the entire application.
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly API_KEY: string;
      readonly VITE_SUPABASE_URL: string;
      readonly VITE_SUPABASE_ANON_KEY: string;
    }
  }
}

// This is necessary to make the declaration a module and avoid conflicts.
export {};
