/**
 * Application Configuration
 * 
 * Centralized access to environment variables with defaults.
 * All environment variables should be accessed through this file.
 */

export const config = {
  /**
   * Backend API URL
   * Used for all API requests
   */
  apiUrl: import.meta.env.VITE_API_URL || '/api/v1',

  /**
   * Application name
   * Displayed in the UI
   */
  appName: import.meta.env.VITE_APP_NAME || 'Raven',

  /**
   * Current environment
   */
  env: import.meta.env.VITE_ENV || 'development',

  /**
   * Check if running in development mode
   */
  isDev: import.meta.env.DEV,

  /**
   * Check if running in production mode
   */
  isProd: import.meta.env.PROD,

  /**
   * Supabase URL
   */
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,

  /**
   * Supabase Anon Key
   */
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
} as const;

// Export individual values for convenience
export const { apiUrl, appName, env, isDev, isProd } = config;
