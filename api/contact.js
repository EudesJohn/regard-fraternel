// Fonction serveur Vercel — envoi du formulaire de contact par e-mail.
// Utilise FormSubmit (gratuit, illimité, sans clé API) : la fonction reçoit
// les données, les valide et les transfère à FormSubmit, qui envoie l'e-mail
// à l'adresse de l'ONG avec un tableau bien structuré (_template: table).
const RECIPIENT = process.env.CONTACT_EMAIL || 'ongregardfraternel13@gmail.com'
// FormSubmit exige un Referer (anti-abus) : il identifie la page d'origine.
const SITE_URL = process.env.SITE_URL || 'https://regard-fraternel.vercel.app/'
const MAX_LENGTH = 5000

const clean = (value = '', max = 1000) =>
  String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max)

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)

export default async function handler(req, res) {
  // Autorise uniquement POST (même origine : /api/contact)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  }

  let data
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
  } catch {
    return res.status(400).json({ error: 'Requête invalide.' })
  }

  const nom = clean(data.nom, 200)
  const email = clean(data.email, 200)
  const telephone = clean(data.telephone, 100)
  const message = clean(data.message, MAX_LENGTH)

  // Validation
  if (!nom || !email || !message) {
    return res.status(400).json({ error: 'Veuillez renseigner votre nom, votre e-mail et votre message.' })
  }
  if (!validEmail(email)) {
    return res.status(400).json({ error: "L'adresse e-mail n'est pas valide." })
  }

  try {
    const response = await fetch(`https://formsubmit.co/ajax/${RECIPIENT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Referer: SITE_URL
      },
      body: JSON.stringify({
        'Nom complet': nom,
        'E-mail': email,
        'Téléphone': telephone || 'Non renseigné',
        'Message': message,
        _template: 'table',
        _subject: `Nouveau message du site REGARD FRATERNEL — ${nom}`,
        _captcha: 'false'
      })
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.success === 'false') {
      console.error('FormSubmit a répondu avec une erreur :', JSON.stringify(result))
      return res.status(502).json({ error: "L'envoi de l'e-mail a échoué, réessayez plus tard." })
    }

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Erreur lors de l’envoi via FormSubmit :', error)
    return res.status(500).json({ error: "L'envoi de l'e-mail a échoué, réessayez plus tard." })
  }
}
