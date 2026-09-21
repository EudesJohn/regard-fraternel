<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { supabase, isSupabaseConfigured } from '../../../src/lib/supabase.js'
import {
  SECTIONS,
  getManagedPhotos,
  addPhoto,
  updatePhoto,
  replacePhoto,
  deletePhoto,
  movePhoto,
  reorderPhotos,
  getSectionSlots,
  replaceSlotPhoto,
  deleteSlotPhoto,
  saveSlotPhoto,
  slotDefault
} from '../../../src/lib/photos.js'
import {
  getStories,
  addStory,
  updateStory,
  replaceStoryPhoto,
  deleteStory,
  moveStory,
  getStoriesConfig,
  saveStoriesConfig
} from '../../../src/lib/stories.js'
import { getPartners, addPartner, updatePartner, deletePartner, movePartner } from '../../../src/lib/partners.js'
import { getDonConfig, saveDonConfig } from '../../../src/lib/don.js'
import Icon from '../../../src/components/Icon.vue'
import { fakeDelay, LIMITS } from '../../../src/lib/validation.js'

/* ---------- État ---------- */
const session = ref(null)
const loading = ref(true)
const activeSection = ref('hero')
const photos = ref([])
const slots = ref({})
const busy = ref(false)
const notice = ref('') // message d'information (succès / erreur)
const noticeType = ref('success')

/* Formulaire de connexion */
const email = ref('')
const password = ref('')
const loginError = ref('')
const loginBusy = ref(false)

/* ---------- Anti force brute côté client (complète la porte /admin) ---------- */
const LOCK_KEY = 'rf_admin_lock'
const MAX_LOGIN_TRIES = 5
const LOCK_SECONDS = 300 // 5 minutes

const lockUntil = () => Number(sessionStorage.getItem(LOCK_KEY) || 0)
const isLocked = () => Date.now() < lockUntil()
const lockRemaining = () => Math.max(0, Math.ceil((lockUntil() - Date.now()) / 1000))

/** Journalise un échec local et bloque après MAX_LOGIN_TRIES tentatives. */
function registerFailedAttempt() {
  const key = `${LOCK_KEY}:count`
  const count = Number(sessionStorage.getItem(key) || 0) + 1
  sessionStorage.setItem(key, String(count))
  if (count >= MAX_LOGIN_TRIES) {
    sessionStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_SECONDS * 1000))
    sessionStorage.setItem(key, '0')
    console.warn(
      JSON.stringify({
        app: 'admin-ui',
        event: 'login_locked_client',
        ts: new Date().toISOString(),
        remaining_seconds: LOCK_SECONDS
      })
    )
  }
  return isLocked()
}

/* Ajout de photos libres */
const files = ref([])
const newCaption = ref('')

/* Édition de légende (photos libres) */
const editingId = ref(null)
const editingCaption = ref('')

/* Remplacer une photo libre */
const replacingId = ref(null)

/* Emplacements fixes */
const slotCaptions = ref({})
const savingSlot = ref(null)
const savedSlot = ref(null)

/* Glisser-déposer */
const dragOverSlot = ref(null) // clé de l'emplacement survolé par un fichier
const dragOverAdd = ref(false) // zone d'ajout survolée par des fichiers
const dragIndex = ref(null) // index de la photo déplacée (réordonnancement)
const dragOverIndex = ref(null) // index de la photo ciblée par le déplacement

const sectionObj = computed(() => SECTIONS.find((s) => s.slug === activeSection.value))
const sectionLabel = computed(() => sectionObj.value?.name || activeSection.value)

/* Panneaux spécifiques selon l'onglet actif */
const showPartnersAdmin = computed(() => activeSection.value === 'partenaires')
const showStoriesAdmin = computed(() => activeSection.value === 'histoires')
const showDonAdmin = computed(() => activeSection.value === 'don')

const slotImg = (key) => slots.value[key]?.url || slotDefault(activeSection.value, key)
const slotIsCustom = (key) => Boolean(slots.value[key])

/* ---------- Authentification ---------- */
onMounted(async () => {
  if (!isSupabaseConfigured) {
    loading.value = false
    return
  }
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  loading.value = false

  supabase.auth.onAuthStateChange((_event, newSession) => {
    session.value = newSession
    if (newSession) {
      loadPhotos()
      loadSlots()
      loadStories()
      loadStoriesCfg()
      loadPartners()
      loadDon()
    }
  })

  // Empêche le navigateur d'ouvrir une image lâchée en dehors des zones de dépôt
  window.addEventListener('dragover', onWindowDragOver)
  window.addEventListener('drop', onWindowDrop)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragover', onWindowDragOver)
  window.removeEventListener('drop', onWindowDrop)
})

const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files')

const onWindowDragOver = (e) => {
  if (hasFiles(e)) e.preventDefault() // bloque la navigation vers le fichier
}

const onWindowDrop = (e) => {
  dragOverSlot.value = null
  dragOverAdd.value = false
  if (hasFiles(e)) e.preventDefault()
}

const signIn = async () => {
  if (loginBusy.value) return

  // Blocage local actif ? (miroir du rate limiting serveur de la porte /admin)
  if (isLocked()) {
    loginError.value = `Trop de tentatives. Réessayez dans ${lockRemaining()} secondes.`
    return
  }

  loginBusy.value = true
  loginError.value = ''

  // Débit artificiel : la réponse prend toujours ~500 ms (anti-énumération temporelle).
  const [result] = await Promise.all([supabase.auth.signInWithPassword({
    email: email.value.trim().toLowerCase(),
    password: password.value
  }), fakeDelay(500)])
  const { error } = result
  loginBusy.value = false

  if (error) {
    const locked = registerFailedAttempt()
    // Message UNIQUEMENT générique : ni le type de compte, ni l'erreur technique
    // (rate limit Supabase, compte inexistant…) ne fuient vers l'écran de connexion.
    loginError.value = locked
      ? `Trop de tentatives. Réessayez dans ${LOCK_SECONDS / 60} minutes.`
      : 'E-mail ou mot de passe incorrect.'
    return
  }

  sessionStorage.removeItem(`${LOCK_KEY}:count`)
  sessionStorage.removeItem(LOCK_KEY)
  password.value = ''
}

const signingOut = ref(false)

const signOut = async () => {
  if (signingOut.value) return
  signingOut.value = true
  try {
    await supabase.auth.signOut()
    session.value = null
    photos.value = []
    slots.value = {}
    email.value = ''
    password.value = ''
  } finally {
    signingOut.value = false
  }
}

/* ---------- Messages ---------- */
const flash = (msg, type = 'success') => {
  notice.value = msg
  noticeType.value = type
  setTimeout(() => (notice.value = ''), 4000)
}

/**
 * Journalisation locale (console) — l'erreur TECHNIQUE reste dans la console
 * de l'administrateur, jamais affichée dans l'interface (pas de fuite de
 * détails de base de données / stack traces à l'écran).
 */
function logError(context, err) {
  console.error(
    JSON.stringify({ app: 'admin-ui', event: 'operation_failed', context, message: err?.message, ts: new Date().toISOString() })
  )
}

/** Message GÉNÉRIQUE à afficher, avec indice si le schéma n'est pas à jour. */
const withHint = (err) => {
  logError('admin_operation', err)
  const msg = err?.message || ''
  if (/key/i.test(msg) && /(does not exist|could not find|schema cache|on conflict)/i.test(msg)) {
    return "Erreur : la migration du schéma n'est pas appliquée. Exécutez « supabase/schema.sql » dans l'éditeur SQL de Supabase (colonne key)."
  }
  if (/validation|refusée|refusé|taille|format/i.test(msg)) {
    // Nos propres messages de validation : compréhensibles et sûrs à afficher.
    return `Erreur : ${msg}`
  }
  return "Une erreur est survenue. Vérifiez votre connexion puis réessayez."
}

/* ---------- Emplacements fixes ---------- */
const initSlotCaptions = () => {
  const obj = {}
  for (const s of sectionObj.value?.slots || []) {
    obj[s.key] = slots.value[s.key]?.caption || ''
  }
  slotCaptions.value = obj
}

const loadSlots = async () => {
  slots.value = await getSectionSlots(activeSection.value)
  initSlotCaptions()
}

const onSlotFile = async (slot, e) => {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  busy.value = true
  try {
    await replaceSlotPhoto(activeSection.value, slot.key, file, slots.value[slot.key])
    flash(`« ${slot.label} » mise à jour.`)
    await loadSlots()
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
    e.target.value = ''
  }
}

/* Dépôt d'un fichier sur un emplacement fixe : remplace la photo */
const onDropSlot = async (slot, e) => {
  dragOverSlot.value = null
  const file = Array.from(e.dataTransfer?.files || []).find((f) => f.type.startsWith('image/'))
  if (!file) return
  busy.value = true
  try {
    await replaceSlotPhoto(activeSection.value, slot.key, file, slots.value[slot.key])
    flash(`« ${slot.label} » mise à jour.`)
    await loadSlots()
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
  }
}

const onSlotDragEnter = (slot) => {
  if (!busy.value) dragOverSlot.value = slot.key
}

const onSlotDragLeave = (slot, e) => {
  // Ignore les dragleave déclenchés par les éléments enfants
  if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return
  if (dragOverSlot.value === slot.key) dragOverSlot.value = null
}

const saveSlotCaption = async (slot) => {
  busy.value = true
  savingSlot.value = slot.key
  savedSlot.value = null
  try {
    const caption = (slotCaptions.value[slot.key] || '').trim()
    const current = slots.value[slot.key]
    if (current) {
      await updatePhoto(current.id, { caption })
    } else {
      // Pas encore d'image personnalisée : la légende est enregistrée avec la photo locale par défaut
      await saveSlotPhoto(activeSection.value, slot.key, {
        url: slotDefault(activeSection.value, slot.key),
        caption
      })
    }
    await loadSlots()
    savedSlot.value = slot.key
    setTimeout(() => (savedSlot.value = null), 2500)
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
    savingSlot.value = null
  }
}

const resetSlot = async (slot) => {
  if (!window.confirm(`Restaurer la photo par défaut de « ${slot.label} » ?`)) return
  busy.value = true
  try {
    await deleteSlotPhoto(activeSection.value, slot.key)
    flash('Photo par défaut restaurée.')
    await loadSlots()
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
  }
}

/* ---------- Gestion des photos libres ---------- */
const loadPhotos = async () => {
  photos.value = await getManagedPhotos(activeSection.value)
}

const switchSection = (slug) => {
  activeSection.value = slug
  files.value = []
  newCaption.value = ''
  editingId.value = null
  replacingId.value = null
  savedSlot.value = null
  dragIndex.value = null
  dragOverIndex.value = null
  loadPhotos()
  loadSlots()
}

const onFilesSelected = (e) => {
  files.value = Array.from(e.target.files || [])
  newCaption.value = ''
}

const addPhotos = async () => {
  if (!files.value.length) return
  busy.value = true
  try {
    for (const file of files.value) {
      await addPhoto(activeSection.value, file, newCaption.value.trim())
    }
    flash(`${files.value.length} photo(s) ajoutée(s).`)
    files.value = []
    newCaption.value = ''
    await loadPhotos()
  } catch (e) {
    flash(withHint(e), 'error')
  } finally {
    busy.value = false
  }
}

/* Dépôt de fichiers sur la zone d'ajout : ajoute directement les photos */
const onDropAdd = async (e) => {
  dragOverAdd.value = false
  const imgs = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'))
  if (!imgs.length) return
  busy.value = true
  try {
    for (const file of imgs) {
      await addPhoto(activeSection.value, file, newCaption.value.trim())
    }
    flash(`${imgs.length} photo(s) ajoutée(s).`)
    await loadPhotos()
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
  }
}

/* ---------- Glisser-déposer : réordonnancement des photos ---------- */
const onDragStartPhoto = (index, e) => {
  dragIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(index)) // requis par certains navigateurs
}

const onDragOverPhoto = (index, e) => {
  if (dragIndex.value === null) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = index
}

const onDropPhoto = async (index, e) => {
  e.preventDefault()
  e.stopPropagation()
  const from = dragIndex.value
  dragIndex.value = null
  dragOverIndex.value = null
  if (from === null || from === index || busy.value) return

  const list = [...photos.value]
  const [moved] = list.splice(from, 1)
  list.splice(index, 0, moved)
  photos.value = list // mise à jour immédiate de l'interface

  busy.value = true
  try {
    await reorderPhotos(list)
    flash('Ordre des photos mis à jour.')
  } catch (err) {
    flash(withHint(err), 'error')
    await loadPhotos()
  } finally {
    busy.value = false
  }
}

const onDragEndPhoto = () => {
  dragIndex.value = null
  dragOverIndex.value = null
}

const startEdit = (photo) => {
  editingId.value = photo.id
  editingCaption.value = photo.caption || ''
}

const saveCaption = async (photo) => {
  busy.value = true
  try {
    await updatePhoto(photo.id, { caption: editingCaption.value.trim().slice(0, LIMITS.caption) })
    photo.caption = editingCaption.value.trim().slice(0, LIMITS.caption)
    editingId.value = null
    flash('Légende enregistrée.')
  } catch (e) {
    flash(withHint(e), 'error')
  } finally {
    busy.value = false
  }
}

const onReplaceSelected = async (photo, e) => {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  busy.value = true
  try {
    await replacePhoto(photo, file)
    flash('Photo remplacée.')
    await loadPhotos()
  } catch (e) {
    flash(withHint(e), 'error')
  } finally {
    busy.value = false
    replacingId.value = null
  }
}

const removePhoto = async (photo) => {
  if (!window.confirm('Supprimer définitivement cette photo ?')) return
  busy.value = true
  try {
    await deletePhoto(photo)
    flash('Photo supprimée.')
    await loadPhotos()
  } catch (e) {
    flash(withHint(e), 'error')
  } finally {
    busy.value = false
  }
}

const reorder = async (photo, dir) => {
  busy.value = true
  try {
    await movePhoto(photo, dir, photos.value)
    await loadPhotos()
  } catch (e) {
    flash(withHint(e), 'error')
  } finally {
    busy.value = false
  }
}

/* ============================================================
 * NOS HISTOIRES (table stories + stories_config)
 * ============================================================ */
const stories = ref([])
const storiesCfg = ref({ subtitle: '', intro: '', outro: '' })
const savingStoriesCfg = ref(false)

/* Nouvelle histoire */
const storyFile = ref(null)
const storyForm = ref({ caption: '', kicker: '', body: '' })

/* Édition d'une histoire existante */
const editingStoryId = ref(null)
const storyEdit = ref({ caption: '', kicker: '', body: '' })
const replacingStoryId = ref(null)

const loadStories = async () => {
  if (!session.value) return
  stories.value = await getStories()
}

const loadStoriesCfg = async () => {
  if (!session.value) return
  storiesCfg.value = await getStoriesConfig()
}

const saveStoriesTexts = async () => {
  busy.value = true
  savingStoriesCfg.value = true
  try {
    await saveStoriesConfig(storiesCfg.value)
    flash('Textes de la page « Nos histoires » enregistrés.')
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
    savingStoriesCfg.value = false
  }
}

const onStoryFile = (e) => {
  storyFile.value = e.target.files?.[0] || null
}

const submitStory = async () => {
  if (!storyFile.value) {
    flash('Choisissez d\'abord une photo pour l\'histoire.', 'error')
    return
  }
  busy.value = true
  try {
    await addStory(storyFile.value, {
      caption: storyForm.value.caption,
      kicker: storyForm.value.kicker,
      body: storyForm.value.body
    })
    flash('Histoire publiée.')
    storyFile.value = null
    storyForm.value = { caption: '', kicker: '', body: '' }
    resetStoryInput()
    await loadStories()
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
  }
}

/** Réinitialise le champ fichier (nécessite une ref sur l'input). */
const storyInput = ref(null)
const resetStoryInput = () => {
  if (storyInput.value) storyInput.value.value = ''
}

const startEditStory = (s) => {
  editingStoryId.value = s.id
  storyEdit.value = { caption: s.caption, kicker: s.kicker, body: s.body }
}

const saveStoryEdit = async (s) => {
  busy.value = true
  try {
    await updateStory(s.id, storyEdit.value)
    Object.assign(s, storyEdit.value)
    editingStoryId.value = null
    flash('Histoire mise à jour.')
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
  }
}

const onReplaceStoryPhoto = async (s, e) => {
  const file = e.target.files?.[0]
  if (!file) return
  busy.value = true
  try {
    const updated = await replaceStoryPhoto(s, file)
    Object.assign(s, updated)
    flash('Photo de l\'histoire remplacée.')
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
    replacingStoryId.value = null
  }
}

const removeStory = async (s) => {
  if (!window.confirm('Supprimer définitivement cette histoire ?')) return
  busy.value = true
  try {
    await deleteStory(s)
    flash('Histoire supprimée.')
    await loadStories()
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
  }
}

const reorderStory = async (s, dir) => {
  busy.value = true
  try {
    await moveStory(s, dir, stories.value)
    await loadStories()
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
  }
}

/* ============================================================
 * PARTENAIRES (table partners)
 * ============================================================ */
const partners = ref([])
const partnerForm = ref({ name: '', description: '', email: '', phone: '' })
const addingPartner = ref(false)
const editingPartnerId = ref(null)
const partnerEdit = ref({ name: '', description: '', email: '', phone: '' })

const loadPartners = async () => {
  if (!session.value) return
  partners.value = await getPartners()
}

const resetPartnerForm = () => {
  partnerForm.value = { name: '', description: '', email: '', phone: '' }
}

const submitPartner = async () => {
  busy.value = true
  addingPartner.value = true
  try {
    await addPartner(partnerForm.value)
    flash('Partenaire ajouté.')
    resetPartnerForm()
    await loadPartners()
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
    addingPartner.value = false
  }
}

const startEditPartner = (p) => {
  editingPartnerId.value = p.id
  partnerEdit.value = { name: p.name, description: p.description, email: p.email, phone: p.phone }
}

const savePartnerEdit = async (p) => {
  busy.value = true
  try {
    const updated = await updatePartner(p.id, partnerEdit.value)
    Object.assign(p, updated)
    editingPartnerId.value = null
    flash('Partenaire mis à jour.')
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
  }
}

const removePartner = async (p) => {
  if (!window.confirm(`Supprimer le partenaire « ${p.name} » ?`)) return
  busy.value = true
  try {
    await deletePartner(p.id)
    flash('Partenaire supprimé.')
    await loadPartners()
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
  }
}

const reorderPartner = async (p, dir) => {
  busy.value = true
  try {
    await movePartner(p, dir, partners.value)
    await loadPartners()
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
  }
}

/* ============================================================
 * DONS (table don_config)
 * ============================================================ */
const donCfg = ref(null)
const donAmountsText = ref('')
const savingDon = ref(false)

const loadDon = async () => {
  if (!session.value) return
  donCfg.value = await getDonConfig()
  donAmountsText.value = (donCfg.value.amounts || []).join(', ')
}

const parseAmounts = () =>
  donAmountsText.value
    .split(/[^0-9]+/)
    .map((s) => Math.round(Number(s)))
    .filter((n) => Number.isFinite(n) && n > 0)

const addDonChannel = () => {
  donCfg.value.payment_channels.push({ label: '', number: '', holder: '', description: '' })
}

const removeDonChannel = (i) => {
  donCfg.value.payment_channels.splice(i, 1)
}

const saveDon = async () => {
  busy.value = true
  savingDon.value = true
  try {
    donCfg.value.amounts = parseAmounts()
    await saveDonConfig(donCfg.value)
    flash('Configuration des dons enregistrée.')
    await loadDon()
  } catch (err) {
    flash(withHint(err), 'error')
  } finally {
    busy.value = false
    savingDon.value = false
  }
}

</script>

<template>
  <div class="admin">
    <!-- Supabase non configuré -->
    <section v-if="!isSupabaseConfigured" class="admin__panel">
      <h2 class="admin__title">Administration — configuration requise</h2>
      <p class="admin__text">
        Pour utiliser la gestion des photos, renseignez vos clés Supabase dans un
        fichier <code>admin/.env</code> (ou dans les variables d'environnement du
        projet Vercel dédié à l'admin) :
      </p>
      <pre class="admin__code">VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...</pre>
      <p class="admin__text">
        Puis exécutez le script <code>supabase/schema.sql</code> dans l'éditeur SQL du
        dashboard Supabase et créez le compte administrateur
        (Authentication → Users → Add user).
      </p>
    </section>

    <!-- Connexion -->
    <section v-else-if="loading" class="admin__panel">
      <p class="admin__loading">Chargement…</p>
    </section>

    <section v-else-if="!session" class="admin__panel admin__panel--narrow admin__login">
      <div class="admin__login-icon">
        <Icon name="shield" :size="30" />
      </div>
      <h2 class="admin__title admin__login-title">Connexion administrateur</h2>
      <p class="admin__login-sub">Espace sécurisé — réservé à l'administration</p>
      <form class="admin__form" @submit.prevent="signIn">
        <div class="form-field">
          <label for="admin-email">E-mail</label>
          <input id="admin-email" v-model="email" type="email" required maxlength="254" autocomplete="username" placeholder="admin@regardfraternel.org" />
        </div>
        <div class="form-field">
          <label for="admin-password">Mot de passe</label>
          <input id="admin-password" v-model="password" type="password" required maxlength="128" autocomplete="current-password" placeholder="••••••••" />
        </div>
        <p v-if="loginError" class="admin__error">{{ loginError }}</p>
        <button type="submit" class="btn btn--primary" style="width: 100%; justify-content: center" :disabled="loginBusy">
          {{ loginBusy ? 'Connexion…' : 'Se connecter' }}
          <Icon name="arrowRight" :size="18" />
        </button>
      </form>
    </section>

    <!-- Gestion -->
    <section v-else>
      <header class="admin__head">
        <div>
          <h2 class="admin__title">Gestion des photos</h2>
          <p class="admin__text">
            Connecté en tant que <strong>{{ session.user.email }}</strong>
          </p>
        </div>
        <button class="btn btn--danger" :disabled="signingOut" @click="signOut">
          <Icon name="x" :size="16" />
          {{ signingOut ? 'Déconnexion…' : 'Se déconnecter' }}
        </button>
      </header>

      <p v-if="notice" class="admin__notice" :class="`admin__notice--${noticeType}`">{{ notice }}</p>

      <!-- Sélecteur de section (noms exacts des pages du site) -->
      <div class="admin__tabs" role="tablist" aria-label="Sections">
        <button
          v-for="s in SECTIONS"
          :key="s.slug"
          class="admin__tab"
          :class="{ 'is-active': activeSection === s.slug }"
          role="tab"
          :aria-selected="activeSection === s.slug"
          @click="switchSection(s.slug)"
        >
          {{ s.name }}
        </button>
      </div>

      <p v-if="sectionObj?.path" class="admin__page-path">
        Page concernée :
        <a :href="sectionObj.path" target="_blank" rel="noopener">{{ sectionObj.path }}</a>
        <span class="admin__page-path-arrow">↗</span>
      </p>

      <!-- Emplacements fixes -->
      <div v-if="sectionObj?.slots?.length" class="admin__panel">
        <h3 class="admin__subtitle">Photos de mise en page — {{ sectionLabel }}</h3>
        <p class="admin__text">
          Remplacez ici les images affichées sur la page : cliquez sur « Remplacer » ou
          <strong>glissez-déposez</strong> directement une photo sur la vignette. Tant que
          vous ne personnalisez pas un emplacement, la photo locale par défaut reste
          affichée (badge « Photo par défaut »).
        </p>

        <div class="admin__slots">
          <article
            v-for="slot in sectionObj.slots"
            :key="slot.key"
            class="admin__slot"
            :class="{ 'is-drop': dragOverSlot === slot.key }"
            @dragenter.prevent="onSlotDragEnter(slot)"
            @dragover.prevent
            @dragleave="onSlotDragLeave(slot, $event)"
            @drop.prevent="onDropSlot(slot, $event)"
          >
            <div class="admin__slot-imgwrap">
              <img :src="slotImg(slot.key)" :alt="slot.label" />
              <span class="admin__slot-badge" :class="{ 'is-custom': slotIsCustom(slot.key) }">
                {{ slotIsCustom(slot.key) ? 'Personnalisée' : 'Photo par défaut' }}
              </span>
              <div v-if="dragOverSlot === slot.key" class="admin__slot-drop">
                <Icon name="download" :size="28" />
                <span>Déposez pour remplacer</span>
              </div>
            </div>
            <div class="admin__slot-body">
              <h4>{{ slot.label }}</h4>

              <div class="admin__slot-row">
                <label class="admin__icon-btn" :title="`Remplacer « ${slot.label} »`" style="width: 38px; height: 38px">
                  <Icon name="download" :size="17" />
                  <input
                    type="file"
                    accept="image/*"
                    class="admin__hidden-input"
                    :disabled="busy"
                    @change="onSlotFile(slot, $event)"
                  />
                </label>
                <button
                  v-if="slotIsCustom(slot.key)"
                  class="admin__icon-btn admin__icon-btn--danger"
                  style="width: 38px; height: 38px"
                  title="Restaurer la photo par défaut"
                  :disabled="busy"
                  @click="resetSlot(slot)"
                >
                  <Icon name="rotate" :size="17" />
                </button>
                <span class="admin__slot-hint">Remplacer</span>
              </div>

              <div class="admin__slot-caption">
                <input
                  v-model="slotCaptions[slot.key]"
                  class="admin__caption-input"
                  type="text"
                  :maxlength="LIMITS.caption"
                  :placeholder="`Légende (optionnelle) — ${slot.label}`"
                  @keyup.enter="saveSlotCaption(slot)"
                />
                <button
                  class="btn btn--primary btn--sm"
                  :disabled="busy || savingSlot === slot.key"
                  @click="saveSlotCaption(slot)"
                >
                  {{ savingSlot === slot.key ? '…' : 'Enregistrer' }}
                </button>
              </div>
              <p v-if="savedSlot === slot.key" class="admin__saved">Enregistré ✓</p>
            </div>
          </article>
        </div>
      </div>

      <!-- Photos libres -->
      <div v-if="sectionObj?.freePhotos" class="admin__panel">
        <h3 class="admin__subtitle">Galerie — {{ sectionLabel }}</h3>
        <div
          class="admin__add"
          :class="{ 'is-drop': dragOverAdd }"
          @dragenter.prevent="!busy && (dragOverAdd = true)"
          @dragover.prevent
          @dragleave="onSlotDragLeave({ key: '__add__' }, $event); dragOverAdd = false"
          @drop.prevent="onDropAdd($event)"
        >
          <label class="admin__file">
            <Icon name="zoomIn" :size="18" />
            Choisir des fichiers
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple @change="onFilesSelected" />
          </label>
          <span class="admin__drop-hint">
            ou glissez-déposez vos photos ici
          </span>
          <span v-if="files.length" class="admin__file-count">{{ files.length }} fichier(s) sélectionné(s)</span>
          <input
            v-model="newCaption"
            class="admin__caption-input"
            type="text"
            :maxlength="LIMITS.caption"
            placeholder="Légende (optionnelle) appliquée à toutes les photos"
          />
          <button class="btn btn--primary" :disabled="busy || !files.length" @click="addPhotos">
            <Icon name="download" :size="16" />
            Ajouter
          </button>
        </div>

        <div v-if="photos.length" class="admin__grid">
          <article
            v-for="(photo, i) in photos"
            :key="photo.id"
            class="admin__photo"
            :class="{ 'is-dragging': dragIndex === i, 'is-drop-target': dragOverIndex === i && dragIndex !== null && dragIndex !== i }"
            draggable="true"
            @dragstart="onDragStartPhoto(i, $event)"
            @dragover="onDragOverPhoto(i, $event)"
            @drop="onDropPhoto(i, $event)"
            @dragend="onDragEndPhoto"
          >
            <img :src="photo.url" :alt="photo.caption || 'Photo'" />
            <div class="admin__photo-tools">
              <div class="admin__photo-actions">
                <span class="admin__drag-handle" title="Glisser pour réordonner">
                  <Icon name="menu" :size="15" />
                </span>
                <button class="admin__icon-btn" title="Monter" :disabled="busy || i === 0" @click="reorder(photo, -1)">
                  <Icon name="chevronLeft" :size="16" style="transform: rotate(90deg)" />
                </button>
                <button class="admin__icon-btn" title="Descendre" :disabled="busy || i === photos.length - 1" @click="reorder(photo, 1)">
                  <Icon name="chevronRight" :size="16" style="transform: rotate(90deg)" />
                </button>
              </div>
              <div class="admin__photo-actions">
                <label class="admin__icon-btn" title="Remplacer la photo">
                  <Icon name="download" :size="16" />
                  <input
                    type="file"
                    accept="image/*"
                    class="admin__hidden-input"
                    :disabled="replacingId === photo.id"
                    @change="onReplaceSelected(photo, $event)"
                  />
                </label>
                <button class="admin__icon-btn admin__icon-btn--danger" title="Supprimer" :disabled="busy" @click="removePhoto(photo)">
                  <Icon name="x" :size="16" />
                </button>
              </div>
            </div>

            <div class="admin__photo-caption">
              <template v-if="editingId === photo.id">
                <input
                  v-model="editingCaption"
                  class="admin__caption-input"
                  type="text"
                  :maxlength="LIMITS.caption"
                  placeholder="Légende"
                  @keyup.enter="saveCaption(photo)"
                  @keyup.esc="editingId = null"
                />
                <button class="btn btn--primary btn--sm" :disabled="busy" @click="saveCaption(photo)">OK</button>
              </template>
              <template v-else>
                <span class="admin__caption-text" :class="{ 'is-empty': !photo.caption }" @click="startEdit(photo)">
                  {{ photo.caption || 'Ajouter une légende…' }}
                </span>
                <button class="admin__edit-link" @click="startEdit(photo)">Modifier</button>
              </template>
            </div>
          </article>
        </div>

        <p v-else class="admin__empty">Aucune photo dans cette galerie pour l'instant.</p>
      </div>

      <!-- ============================================================
           PARTENAIRES — cartes éditables (table partners)
           ============================================================ -->
      <div v-if="showPartnersAdmin" class="admin__panel">
        <h3 class="admin__subtitle">Cartes partenaires — {{ sectionLabel }}</h3>
        <p class="admin__text">
          Chaque carte affiche un nom, une description et des coordonnées (optionnels).
          Les logos restent gérés via la galerie ci-dessus.
        </p>

        <!-- Ajout -->
        <div class="admin__add">
          <div class="admin__partner-form">
            <div class="form-field">
              <label>Nom du partenaire *</label>
              <input v-model="partnerForm.name" type="text" :maxlength="80" placeholder="Ex. Croce Rossa Italiana" />
            </div>
            <div class="form-field">
              <label>Description</label>
              <textarea v-model="partnerForm.description" rows="3" :maxlength="500" placeholder="Description affichée sur la carte"></textarea>
            </div>
            <div class="admin__partner-row">
              <div class="form-field">
                <label>E-mail (optionnel)</label>
                <input v-model="partnerForm.email" type="email" :maxlength="254" placeholder="contact@exemple.org" />
              </div>
              <div class="form-field">
                <label>Téléphone (optionnel)</label>
                <input v-model="partnerForm.phone" type="tel" :maxlength="20" placeholder="+39 ..." />
              </div>
            </div>
            <button class="btn btn--primary" :disabled="busy || addingPartner || !partnerForm.name.trim()" @click="submitPartner">
              <Icon name="check" :size="16" />
              Ajouter le partenaire
            </button>
          </div>
        </div>

        <!-- Liste -->
        <div v-if="partners.length" class="admin__partners">
          <article v-for="(p, i) in partners" :key="p.id" class="admin__partner">
            <div class="admin__partner-order">
              <button class="admin__icon-btn" title="Monter" :disabled="busy || i === 0" @click="reorderPartner(p, -1)">
                <Icon name="chevronLeft" :size="16" style="transform: rotate(90deg)" />
              </button>
              <button class="admin__icon-btn" title="Descendre" :disabled="busy || i === partners.length - 1" @click="reorderPartner(p, 1)">
                <Icon name="chevronRight" :size="16" style="transform: rotate(90deg)" />
              </button>
            </div>

            <div v-if="editingPartnerId !== p.id" class="admin__partner-body">
              <h4>{{ p.name }}</h4>
              <p v-if="p.description" class="admin__partner-desc">{{ p.description }}</p>
              <p class="admin__partner-meta">
                <span v-if="p.email">✉ {{ p.email }}</span>
                <span v-if="p.phone">☎ {{ p.phone }}</span>
                <span v-if="!p.email && !p.phone">Aucune coordonnée</span>
              </p>
              <div class="admin__partner-actions">
                <button class="btn btn--primary btn--sm" :disabled="busy" @click="startEditPartner(p)">Modifier</button>
                <button class="btn btn--danger btn--sm" :disabled="busy" @click="removePartner(p)">Supprimer</button>
              </div>
            </div>

            <div v-else class="admin__partner-body admin__partner-body--edit">
              <div class="form-field">
                <label>Nom *</label>
                <input v-model="partnerEdit.name" type="text" :maxlength="80" />
              </div>
              <div class="form-field">
                <label>Description</label>
                <textarea v-model="partnerEdit.description" rows="3" :maxlength="500"></textarea>
              </div>
              <div class="admin__partner-row">
                <div class="form-field">
                  <label>E-mail</label>
                  <input v-model="partnerEdit.email" type="email" :maxlength="254" />
                </div>
                <div class="form-field">
                  <label>Téléphone</label>
                  <input v-model="partnerEdit.phone" type="tel" :maxlength="20" />
                </div>
              </div>
              <div class="admin__partner-actions">
                <button class="btn btn--primary btn--sm" :disabled="busy" @click="savePartnerEdit(p)">Enregistrer</button>
                <button class="btn btn--sm" :disabled="busy" @click="editingPartnerId = null">Annuler</button>
              </div>
            </div>
          </article>
        </div>
        <p v-else class="admin__empty">Aucun partenaire enregistré — ajoutez le premier ci-dessus.</p>
      </div>

      <!-- ============================================================
           NOS HISTOIRES — récits (table stories)
           ============================================================ -->
      <div v-if="showStoriesAdmin" class="admin__panel">
        <h3 class="admin__subtitle">Textes de la page — {{ sectionLabel }}</h3>
        <p class="admin__text">
          Ces textes apparaissent sur la page publique « Nos histoires ».
          La bannière se modifie via « Photos de mise en page » ci-dessus.
        </p>
        <div class="admin__partner-form">
          <div class="form-field">
            <label>Sous-titre (bannière)</label>
            <input v-model="storiesCfg.subtitle" type="text" :maxlength="160" />
          </div>
          <div class="form-field">
            <label>Introduction</label>
            <textarea v-model="storiesCfg.intro" rows="4" :maxlength="1000"></textarea>
          </div>
          <div class="form-field">
            <label>Conclusion (bandeau final)</label>
            <textarea v-model="storiesCfg.outro" rows="2" :maxlength="300"></textarea>
          </div>
          <button class="btn btn--primary" :disabled="busy || savingStoriesCfg" @click="saveStoriesTexts">
            <Icon name="check" :size="16" />
            Enregistrer les textes
          </button>
        </div>
      </div>

      <div v-if="showStoriesAdmin" class="admin__panel">
        <h3 class="admin__subtitle">Récits — {{ sectionLabel }}</h3>
        <p class="admin__text">
          Chaque histoire = une photo + un sur-titre + un titre + un récit.
          Le récit est replié sur le site public avec un bouton « Lire la suite ».
        </p>

        <!-- Nouvelle histoire -->
        <div class="admin__add">
          <div class="admin__partner-form">
            <div class="form-field">
              <label>Photo de l'histoire *</label>
              <label class="admin__file">
                <Icon name="zoomIn" :size="18" />
                {{ storyFile ? storyFile.name : 'Choisir une image' }}
                <input ref="storyInput" type="file" accept="image/jpeg,image/png,image/webp" @change="onStoryFile" />
              </label>
            </div>
            <div class="admin__partner-row">
              <div class="form-field">
                <label>Sur-titre (ex. « Éducation »)</label>
                <input v-model="storyForm.kicker" type="text" :maxlength="60" />
              </div>
              <div class="form-field">
                <label>Titre de l'histoire</label>
                <input v-model="storyForm.caption" type="text" :maxlength="120" />
              </div>
            </div>
            <div class="form-field">
              <label>Le récit</label>
              <textarea v-model="storyForm.body" rows="5" :maxlength="4000" placeholder="Racontez l'histoire : le parcours, les défis, le changement rendu possible…"></textarea>
            </div>
            <button class="btn btn--primary" :disabled="busy || !storyFile" @click="submitStory">
              <Icon name="check" :size="16" />
              Publier l'histoire
            </button>
          </div>
        </div>

        <!-- Liste des histoires -->
        <div v-if="stories.length" class="admin__partners">
          <article v-for="(s, i) in stories" :key="s.id" class="admin__partner">
            <div class="admin__partner-order">
              <button class="admin__icon-btn" title="Monter" :disabled="busy || i === 0" @click="reorderStory(s, -1)">
                <Icon name="chevronLeft" :size="16" style="transform: rotate(90deg)" />
              </button>
              <button class="admin__icon-btn" title="Descendre" :disabled="busy || i === stories.length - 1" @click="reorderStory(s, 1)">
                <Icon name="chevronRight" :size="16" style="transform: rotate(90deg)" />
              </button>
            </div>

            <img class="admin__partner-img" :src="s.url" :alt="s.caption || 'Histoire'" />

            <div v-if="editingStoryId !== s.id" class="admin__partner-body">
              <p v-if="s.kicker" class="admin__partner-kicker">{{ s.kicker }}</p>
              <h4>{{ s.caption || 'Sans titre' }}</h4>
              <p class="admin__partner-desc">{{ s.body ? s.body.slice(0, 140) + (s.body.length > 140 ? '…' : '') : 'Aucun récit.' }}</p>
              <div class="admin__partner-actions">
                <button class="btn btn--primary btn--sm" :disabled="busy" @click="startEditStory(s)">Modifier</button>
                <label class="btn btn--sm admin__btn-file">
                  Photo
                  <input type="file" accept="image/*" class="admin__hidden-input" :disabled="busy" @change="onReplaceStoryPhoto(s, $event)" />
                </label>
                <button class="btn btn--danger btn--sm" :disabled="busy" @click="removeStory(s)">Supprimer</button>
              </div>
            </div>

            <div v-else class="admin__partner-body admin__partner-body--edit">
              <div class="admin__partner-row">
                <div class="form-field">
                  <label>Sur-titre</label>
                  <input v-model="storyEdit.kicker" type="text" :maxlength="60" />
                </div>
                <div class="form-field">
                  <label>Titre</label>
                  <input v-model="storyEdit.caption" type="text" :maxlength="120" />
                </div>
              </div>
              <div class="form-field">
                <label>Le récit</label>
                <textarea v-model="storyEdit.body" rows="5" :maxlength="4000"></textarea>
              </div>
              <div class="admin__partner-actions">
                <button class="btn btn--primary btn--sm" :disabled="busy" @click="saveStoryEdit(s)">Enregistrer</button>
                <button class="btn btn--sm" :disabled="busy" @click="editingStoryId = null">Annuler</button>
              </div>
            </div>
          </article>
          </div>
        <p v-else class="admin__empty">Aucune histoire publiée pour l'instant.</p>
      </div>

      <!-- ============================================================
           DONS — configuration (table don_config)
           ============================================================ -->
      <div v-if="showDonAdmin" class="admin__panel">
        <h3 class="admin__subtitle">Configuration des dons — {{ sectionLabel }}</h3>
        <p class="admin__text">
          Montants proposés, canaux de paiement et instructions affichés sur la page « Faire un don ».
          Après choix d'un montant, le visiteur voit les canaux et les consignes ci-dessous.
        </p>
        <div class="admin__partner-form">
          <div class="form-field">
            <label>Montants proposés (FCFA, séparés par des virgules)</label>
            <input v-model="donAmountsText" type="text" placeholder="Ex. 1000, 2500, 5000, 10000, 25000, 50000" />
          </div>

          <h4 class="admin__channels-title">Canaux de paiement</h4>
          <p class="admin__text" style="margin-bottom: 14px">
            Exemples : MTN MoMo, Moov Money, compte bancaire. Laissez vide si aucun.
          </p>
          <div v-for="(c, i) in donCfg.payment_channels" :key="i" class="don-channel-edit">
            <div class="don-channel-edit__grid">
              <div class="form-field">
                <label>Nom du canal</label>
                <input v-model="c.label" type="text" :maxlength="60" placeholder="Ex. MTN MoMo" />
              </div>
              <div class="form-field">
                <label>Numéro / IBAN</label>
                <input v-model="c.number" type="text" :maxlength="60" placeholder="Ex. +229 01 97 26 96 54" />
              </div>
              <div class="form-field">
                <label>Titulaire</label>
                <input v-model="c.holder" type="text" :maxlength="80" placeholder="Ex. REGARD FRATERNEL" />
              </div>
            </div>
            <div class="form-field">
              <label>Note affichée sous le canal (optionnelle)</label>
              <input v-model="c.description" type="text" :maxlength="200" placeholder="Ex. Nom du bénéficiaire : REGARD FRATERNEL" />
            </div>
            <button class="btn btn--danger btn--sm" :disabled="busy" @click="removeDonChannel(i)">Retirer ce canal</button>
          </div>
          <button class="btn btn--sm admin__btn-add-channel" :disabled="donCfg.payment_channels.length >= 8" @click="addDonChannel">
            <Icon name="check" :size="14" />
            Ajouter un canal de paiement
          </button>

          <div class="form-field" style="margin-top: 18px">
            <label>Instructions après le don</label>
            <textarea v-model="donCfg.instructions" rows="3" :maxlength="1000"></textarea>
            </div>
          <div class="form-field">
            <label>Message du bloc « Pourquoi donner ? »</label>
            <textarea v-model="donCfg.note" rows="3" :maxlength="500"></textarea>
          </div>
          <button class="btn btn--primary" :disabled="busy || savingDon" @click="saveDon">
            <Icon name="check" :size="16" />
            Enregistrer la configuration
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
