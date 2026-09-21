/**
 * REGARD FRATERNEL — Envoi du formulaire de contact via l'Edge Function
 * Supabase « contact » (validation serveur + rate limiting + stockage).
 *
 * Fallback : si l'Edge Function n'est pas déployée/configurée, on retombe
 * sur FormSubmit pour ne jamais perdre un message (comportement historique).
 */

const endpoint = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) return null
  return `${url.replace(/\/$/, '')}/functions/v1/contact`
}

/**
 * Envoie le message de contact.
 * @param {{name: string, email: string, phone?: string, message: string, website?: string}} payload
 * @returns {Promise<'sent'|'fallback-needed'>} 'sent' si la fonction a répondu,
 *   'fallback-needed' si elle n'est pas disponible (→ repli FormSubmit).
 */
export async function sendContactMessage(payload) {
  const url = endpoint()
  if (!url) return 'fallback-needed'

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (res.status === 404 || res.status === 501) return 'fallback-needed'

    if (!res.ok) {
      // 400/403/429/500 : la fonction a répondu — message générique unique.
      return 'sent-error'
    }

    const data = await res.json().catch(() => ({}))
    return data.ok ? 'sent' : 'sent-error'
  } catch {
    // Réseau indisponible : proposer le repli plutôt que perdre le message.
    return 'fallback-needed'
  }
}

/**
 * Envoi historique via FormSubmit (repli).
 * @returns {Promise<'sent'|'error'>}
 */
export async function sendViaFormSubmit({ name, email, phone, message }) {
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/ongregardfraternel13@gmail.com'
  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        'Nom complet': name,
        'E-mail': email,
        'Téléphone': phone || 'Non renseigné',
        'Message': message,
        _template: 'table',
        _subject: `Nouveau message du site REGARD FRATERNEL — ${name}`,
        _captcha: 'false'
      })
    })
    const data = await res.json().catch(() => ({}))
    return res.ok && data.success === 'true' ? 'sent' : 'error'
  } catch {
    return 'error'
  }
}
