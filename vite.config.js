import { defineConfig, loadEnv } from 'vite';

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  return defineConfig({
    server: {
      port: 4173,
    },
    define: {
      __VITE_SUPABASE_URL__: JSON.stringify(supabaseUrl),
      __VITE_SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
    },
  });
};
