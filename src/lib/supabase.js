import { createClient } from '@supabase/supabase-js'

// Variables définies dans le fichier .env (voir .env.example).
// « ?? {} » : tolère un environnement sans injection Vite (tests Node) —
// le client est simplement null au lieu de lever une TypeError.
const env = import.meta.env ?? {}
const url = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Client public (clé anon) — les droits réels sont appliqués par les règles
 * RLS côté Supabase (lecture publique des photos, écriture réservée à
 * l'administrateur). Options de sécurité :
 *  - flowType: 'pkce' : le code d'autorisation OAuth ne circule jamais en clair
 *    dans l'URL (anti-interception, recommandé par Supabase) ;
 *  - persistSession / autoRefreshToken : session gérée proprement par le SDK.
 */
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null
