import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // AI config
  aiProvider: (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : process.env.OPENAI_API_KEY ? 'openai' : 'mock')) as 'gemini' | 'openai' | 'mock',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  // GitHub App config
  github: {
    appId: process.env.GITHUB_APP_ID || '',
    privateKey: (process.env.GITHUB_APP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    webhookSecret: process.env.GITHUB_APP_WEBHOOK_SECRET || 'development_webhook_secret',
    clientId: process.env.GITHUB_APP_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET || '',
  },

  // Supabase Persistence config
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '',
  },
};
