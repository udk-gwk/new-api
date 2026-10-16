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
import type { Place } from './catalog'

export type Lang = 'de' | 'en'

type Text = {
  pageTitle: string
  title: string
  signIn: string
  console: string
  signedInAs: string
  modelsIntro: string
  dataNote: string
  docs: string
  help: string
  stepKey: string
  stepModels: string
  stepCode: string
  how1: string
  how1d: string
  how2: string
  how2d: string
  how3: string
  how3d: string
  places: Record<Place, { name: string; desc: string }>
  experimental: string
  codeLang: string
  copy: string
  copied: string
  baseUrl: string
  model: string
  prompt: string
  picked: string
}

export const TEXT: Record<Lang, Text> = {
  de: {
    pageTitle: 'KI-Modelle per API — GenKI Lab',
    title: 'KI-Modelle per API',
    signIn: 'Mit UdK-Login anmelden',
    console: 'Zur Konsole',
    signedInAs: 'Angemeldet als',
    modelsIntro:
      'Der Modellname in jeder Anfrage legt fest, wo sie verarbeitet wird: Sovereign-Modelle laufen auf Servern der UdK, EU-Modelle in Rechenzentren in der EU. Ein Schlüssel reicht für alle Modelle, die dein Konto nutzen darf.',
    dataNote:
      'Neue Konten nutzen Sovereign; EU schaltet das Lab auf Anfrage frei. EU-Modelle sind experimentell: Schick ihnen keine personenbezogenen Daten.',
    docs: 'Anleitung',
    help: 'Hilfe',
    stepKey: 'Schlüssel',
    stepModels: 'Modell',
    stepCode: 'Code',
    how1: 'Anmelden',
    how1d:
      'Mit deinem UdK-Login. Neue Konten starten mit Guthaben für die Sovereign-Modelle.',
    how2: 'Schlüssel erstellen',
    how2d:
      'In der Konsole unter API-Schlüssel. Ein Schlüssel pro Projekt hält die Kosten auseinander.',
    how3: 'Einsetzen',
    how3d:
      'Der Schlüssel beginnt mit sk- und gehört nur dir. Stell ihn nie in öffentlichen Code.',
    places: {
      sovereign: {
        name: 'Sovereign',
        desc: 'UdK-Hardware, ohne externen Anbieter.',
      },
      eu: {
        name: 'EU',
        desc: 'Rechenzentren in der EU, ohne Speicherung beim Anbieter.',
      },
      us: { name: 'US', desc: 'US-Anbieter. Keine personenbezogenen Daten.' },
    },
    experimental: 'Experimentell',
    codeLang: 'Programmiersprache',
    copy: 'Kopieren',
    copied: 'Kopiert',
    baseUrl: 'Basis-URL',
    model: 'Modell',
    prompt: 'Erkläre in zwei Sätzen, was ein Sprachmodell ist.',
    picked: 'Modell {m} gewählt',
  },
  en: {
    pageTitle: 'AI models by API — GenKI Lab',
    title: 'AI models by API',
    signIn: 'Sign in with UdK login',
    console: 'Open the console',
    signedInAs: 'Signed in as',
    modelsIntro:
      'The model name in each request decides where it is processed: sovereign models run on UdK servers, EU models in data centres in the EU. One key works for every model your account may use.',
    dataNote:
      'New accounts use sovereign; the lab enables EU on request. EU models are experimental: do not send them personal data.',
    docs: 'Guide',
    help: 'Help',
    stepKey: 'Key',
    stepModels: 'Model',
    stepCode: 'Code',
    how1: 'Sign in',
    how1d:
      'With your UdK login. New accounts start with credit for the sovereign models.',
    how2: 'Create a key',
    how2d:
      'In the console under API keys. One key per project keeps costs apart.',
    how3: 'Use it',
    how3d:
      'The key starts with sk- and is yours alone. Never put it in public code.',
    places: {
      sovereign: {
        name: 'Sovereign',
        desc: 'UdK hardware, with no outside provider.',
      },
      eu: {
        name: 'EU',
        desc: 'Data centres in the EU, no retention at the provider.',
      },
      us: { name: 'US', desc: 'US providers. No personal data.' },
    },
    experimental: 'Experimental',
    codeLang: 'Programming language',
    copy: 'Copy',
    copied: 'Copied',
    baseUrl: 'Base URL',
    model: 'Model',
    prompt: 'Explain in two sentences what a language model is.',
    picked: 'Model {m} selected',
  },
}
