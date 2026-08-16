<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import {
  SECTIONS,
  getManagedPhotos,
  addPhoto,
  updatePhoto,
  replacePhoto,
  deletePhoto,
  movePhoto
} from '../lib/photos.js'
import Icon from '../components/Icon.vue'

/* ---------- État ---------- */
const session = ref(null)
const loading = ref(true)
const activeSection = ref('sanitaire')
const photos = ref([])
const busy = ref(false)
const notice = ref('') // message d'information (succès / erreur)
const noticeType = ref('success')

/* Formulaire de connexion */
const email = ref('')
const password = ref('')
const loginError = ref('')
const loginBusy = ref(false)

/* Ajout de photos */
const files = ref([])
const newCaption = ref('')

/* Édition de légende */
const editingId = ref(null)
const editingCaption = ref('')

/* Remplacer une photo */
const replacingId = ref(null)

const sectionLabel = computed(() => SECTIONS.find((s) => s.cle === activeSection.value)?.label || activeSection.value)

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
    if (newSession) loadPhotos()
  })
})

const signIn = async () => {
  loginBusy.value = true
  loginError.value = ''
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })
  loginBusy.value = false
  if (error) {
    loginError.value = error.message === 'Invalid login credentials'
      ? 'Identifiants incorrects.'
      : error.message
  }
}

const signingOut = ref(false)

const signOut = async () => {
  if (signingOut.value) return
  signingOut.value = true
  try {
    await supabase.auth.signOut()
    session.value = null
    photos.value = []
    email.value = ''
    password.value = ''
  } finally {
    signingOut.value = false
  }
}

/* ---------- Gestion des photos ---------- */
const flash = (msg, type = 'success') => {
  notice.value = msg
  noticeType.value = type
  setTimeout(() => (notice.value = ''), 4000)
}

const loadPhotos = async () => {
  photos.value = await getManagedPhotos(activeSection.value)
}

const switchSection = (cle) => {
  activeSection.value = cle
  files.value = []
  newCaption.value = ''
  editingId.value = null
  replacingId.value = null
  loadPhotos()
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
    flash(`Erreur : ${e.message}`, 'error')
  } finally {
    busy.value = false
  }
}

const startEdit = (photo) => {
  editingId.value = photo.id
  editingCaption.value = photo.caption || ''
}

const saveCaption = async (photo) => {
  busy.value = true
  try {
    await updatePhoto(photo.id, { caption: editingCaption.value.trim() })
    photo.caption = editingCaption.value.trim()
    editingId.value = null
    flash('Légende enregistrée.')
  } catch (e) {
    flash(`Erreur : ${e.message}`, 'error')
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
    flash(`Erreur : ${e.message}`, 'error')
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
    flash(`Erreur : ${e.message}`, 'error')
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
    flash(`Erreur : ${e.message}`, 'error')
  } finally {
    busy.value = false
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
        fichier <code>.env</code> à la racine du projet :
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
      <p class="admin__text">Chargement…</p>
    </section>

    <section v-else-if="!session" class="admin__panel admin__panel--narrow">
      <h2 class="admin__title">Connexion administrateur</h2>
      <form class="admin__form" @submit.prevent="signIn">
        <div class="form-field">
          <label for="admin-email">E-mail</label>
          <input id="admin-email" v-model="email" type="email" required placeholder="admin@regardfraternel.org" />
        </div>
        <div class="form-field">
          <label for="admin-password">Mot de passe</label>
          <input id="admin-password" v-model="password" type="password" required placeholder="••••••••" />
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

      <!-- Sélecteur de section -->
      <div class="admin__tabs" role="tablist" aria-label="Sections">
        <button
          v-for="s in SECTIONS"
          :key="s.cle"
          class="admin__tab"
          :class="{ 'is-active': activeSection === s.cle }"
          role="tab"
          :aria-selected="activeSection === s.cle"
          @click="switchSection(s.cle)"
        >
          {{ s.label }}
        </button>
      </div>

      <!-- Formulaire d'ajout -->
      <div class="admin__panel">
        <h3 class="admin__subtitle">Ajouter des photos — {{ sectionLabel }}</h3>
        <div class="admin__add">
          <label class="admin__file">
            <Icon name="zoomIn" :size="18" />
            Choisir des fichiers
            <input type="file" accept="image/*" multiple @change="onFilesSelected" />
          </label>
          <span v-if="files.length" class="admin__file-count">{{ files.length }} fichier(s) sélectionné(s)</span>
          <input
            v-model="newCaption"
            class="admin__caption-input"
            type="text"
            placeholder="Légende (optionnelle) appliquée à toutes les photos"
          />
          <button class="btn btn--primary" :disabled="busy || !files.length" @click="addPhotos">
            <Icon name="download" :size="16" />
            Ajouter
          </button>
        </div>

      </div>

      <!-- Grille des photos -->
      <div v-if="photos.length" class="admin__grid">
        <article v-for="(photo, i) in photos" :key="photo.id" class="admin__photo">
          <img :src="photo.url" :alt="photo.caption || 'Photo'" />
          <div class="admin__photo-tools">
            <div class="admin__photo-actions">
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

      <p v-else class="admin__empty">Aucune photo dans cette section pour l'instant.</p>
    </section>
  </div>
</template>
