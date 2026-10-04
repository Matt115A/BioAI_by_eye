/**
 * Where contributions live. The anon key is Supabase's *public* key (safe to ship in a web page): with the database's row-level
 * security it can only insert rows, read the public view and call withdraw(). Leave empty to switch contributions off.
 */
export const SUPABASE_URL: string = import.meta.env.VITE_BIOAI_URL ?? '';
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_BIOAI_KEY ?? '';
export const BACKEND_READY = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

/** All games are served from the same origin as the hub, so they share browser storage (your own sessions). */
export const SITE = 'https://matt115a.github.io';
