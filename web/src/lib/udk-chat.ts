/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
/**
 * The UdK GenKI Lab chat (Chatwoot inbox "GenKI Lab" on chat.udk.digital,
 * black widget) in builds locked to the `udk` preset. It appears only for
 * signed-in users and carries their UdK email: the inbox enforces HMAC
 * identity, so the email is signed by the backend
 * (`GET /api/user/self/chat-identity`, env UDK_CHATWOOT_HMAC_TOKEN). Signing
 * out resets the conversation and hides the bubble. The site's origin must be
 * in the inbox's Allowed domains, or Chatwoot refuses the frame.
 * Conversations carry `service: api`; the widget language follows the console.
 */
import i18n from 'i18next'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

const BASE_URL = 'https://chat.udk.digital'
const WEBSITE_TOKEN = 'PZVaDZC6WmZ8VNvvDnkriCCV'
const HELP_URL = 'https://onboard.udk.digital'

type Chatwoot = {
  toggle: (state?: 'open' | 'close') => void
  toggleBubbleVisibility: (state: 'show' | 'hide') => void
  setUser: (identifier: string, user: Record<string, string>) => void
  reset: () => void
  setLocale: (locale: string) => void
  setConversationCustomAttributes: (attrs: Record<string, string>) => void
}

type Identity = { identifier: string; identifier_hash: string; email: string; name: string }

declare global {
  interface Window {
    chatwootSettings?: Record<string, unknown>
    chatwootSDK?: {
      run: (opts: { websiteToken: string; baseUrl: string }) => void
    }
    $chatwoot?: Chatwoot
  }
}

const localeOf = (lang: string | undefined) =>
  lang?.toLowerCase().startsWith('de') ? 'de' : 'en'

let ready = false
let identity: Identity | null = null
let currentUserId: number | null = null

function applyIdentity() {
  const cw = window.$chatwoot
  if (!ready || !cw) return
  if (identity) {
    cw.setUser(identity.identifier, {
      email: identity.email,
      name: identity.name,
      identifier_hash: identity.identifier_hash,
    })
  }
  cw.setConversationCustomAttributes({ service: 'api' })
  cw.toggleBubbleVisibility('show')
}

function loadWidget() {
  if (typeof document === 'undefined' || window.chatwootSDK) return
  window.chatwootSettings = {
    locale: localeOf(i18n.language),
    position: 'right',
    type: 'standard',
    // The widget window follows the OS scheme; it cannot see a forced choice.
    darkMode: 'auto',
  }
  window.addEventListener('chatwoot:ready', () => {
    ready = true
    if (currentUserId === null) window.$chatwoot?.toggleBubbleVisibility('hide')
    else applyIdentity()
  })
  i18n.on('languageChanged', (lang) => {
    window.$chatwoot?.setLocale(localeOf(lang))
  })
  const script = document.createElement('script')
  script.src = `${BASE_URL}/packs/js/sdk.js`
  script.async = true
  script.onload = () => {
    window.chatwootSDK?.run({ websiteToken: WEBSITE_TOKEN, baseUrl: BASE_URL })
  }
  document.body.appendChild(script)
}

async function onUserChange(userId: number | null) {
  if (userId === currentUserId) return
  const previous = currentUserId
  currentUserId = userId
  if (userId === null) {
    identity = null
    if (ready && window.$chatwoot) {
      window.$chatwoot.reset()
      window.$chatwoot.toggleBubbleVisibility('hide')
    }
    return
  }
  if (previous !== null && ready) window.$chatwoot?.reset()
  try {
    const res = await api.get('/api/user/self/chat-identity')
    identity = res.data?.success ? (res.data.data as Identity) : null
  } catch {
    identity = null // anonymous chat still works
  }
  if (currentUserId !== userId) return // signed out meanwhile
  loadWidget()
  applyIdentity()
}

/** Starts the chat: it follows the sign-in state from then on. */
export function startUdkChat(): void {
  if (typeof window === 'undefined') return
  const idOf = (s: ReturnType<typeof useAuthStore.getState>) => s.auth.user?.id ?? null
  void onUserChange(idOf(useAuthStore.getState()))
  useAuthStore.subscribe((s) => void onUserChange(idOf(s)))
}

/**
 * Opens the chat window for a "Hilfe" link. Signed out, there is no chat, so
 * the help pages open. Signed in but still loading, it opens once the widget
 * is ready, or falls back to the help pages after 4 s.
 */
export function openUdkChat(): void {
  if (typeof window === 'undefined') return
  if (currentUserId === null) {
    window.location.href = HELP_URL
    return
  }
  if (ready && window.$chatwoot) {
    window.$chatwoot.toggle('open')
    return
  }
  const fallback = window.setTimeout(() => {
    window.removeEventListener('chatwoot:ready', onReady)
    window.location.href = HELP_URL
  }, 4000)
  function onReady() {
    window.clearTimeout(fallback)
    window.$chatwoot?.toggle('open')
  }
  window.addEventListener('chatwoot:ready', onReady, { once: true })
}
