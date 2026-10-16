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
 * black widget), loaded on every page of builds locked to the `udk` preset.
 * The site's origin must be in the inbox's Allowed domains, or Chatwoot
 * refuses the frame. Conversations carry `service: api` so agents see where
 * a chat came from; the widget language follows the console language.
 */
import i18n from 'i18next'

const BASE_URL = 'https://chat.udk.digital'
const WEBSITE_TOKEN = 'PZVaDZC6WmZ8VNvvDnkriCCV'

type Chatwoot = {
  toggle: (state?: 'open' | 'close') => void
  setLocale: (locale: string) => void
  setConversationCustomAttributes: (attrs: Record<string, string>) => void
}

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

const HELP_URL = 'https://onboard.udk.digital'

/**
 * Opens the chat window for a "Hilfe" link. If the widget is still loading,
 * it opens as soon as it is ready; if it never comes (blocked, offline), the
 * help pages open after 4 s instead.
 */
export function openUdkChat(): void {
  if (typeof window === 'undefined') return
  if (window.$chatwoot) {
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

export function loadUdkChat(): void {
  if (typeof document === 'undefined' || window.chatwootSDK) return
  window.chatwootSettings = {
    locale: localeOf(i18n.language),
    position: 'right',
    type: 'standard',
    // The widget window follows the OS scheme; it cannot see a forced choice.
    darkMode: 'auto',
  }
  window.addEventListener('chatwoot:ready', () => {
    window.$chatwoot?.setConversationCustomAttributes({ service: 'api' })
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
