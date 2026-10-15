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
  purpose: string
  statModels: string
  statPlaces: string
  compat: string
  signIn: string
  console: string
  signedInAs: string
  dataNote: string
  docs: string
  prices: string
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
  access: string
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
    purpose:
      'Ein Schlüssel für die Sprachmodelle des GenKI Lab: für eigene Programme, Werkzeuge wie Cursor oder Obsidian und Kunstprojekte. Du entscheidest pro Anfrage, wo deine Daten verarbeitet werden.',
    statModels: 'Modelle',
    statPlaces: 'Orte',
    compat: 'OpenAI-kompatibel',
    signIn: 'Mit UdK-Login anmelden',
    console: 'Zur Konsole',
    signedInAs: 'Angemeldet als',
    dataNote:
      'Mit Sovereign-Modellen bleiben deine Daten auf Servern der UdK. EU-Modelle laufen in Rechenzentren in der EU; solange sie experimentell sind, gib dort keine personenbezogenen Daten ein.',
    docs: 'Anleitung',
    prices: 'Preise',
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
        desc: 'UdK-Hardware. Daten verlassen das Haus nicht.',
      },
      eu: {
        name: 'EU',
        desc: 'Rechenzentren in der EU, ohne Speicherung beim Anbieter.',
      },
      us: { name: 'US', desc: 'US-Anbieter. Keine personenbezogenen Daten.' },
    },
    experimental: 'Experimentell',
    access:
      'Neue Konten nutzen Sovereign. EU schaltet das Lab auf Anfrage frei.',
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
    purpose:
      'One key for the GenKI Lab language models: for your own programs, tools like Cursor or Obsidian, and art projects. You decide per request where your data is processed.',
    statModels: 'models',
    statPlaces: 'locations',
    compat: 'OpenAI-compatible',
    signIn: 'Sign in with UdK login',
    console: 'Open the console',
    signedInAs: 'Signed in as',
    dataNote:
      'With sovereign models your data stays on UdK servers. EU models run in data centres in the EU; while they are experimental, do not enter personal data there.',
    docs: 'Guide',
    prices: 'Prices',
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
        desc: 'UdK hardware. Data never leaves the house.',
      },
      eu: {
        name: 'EU',
        desc: 'Data centres in the EU, no retention at the provider.',
      },
      us: { name: 'US', desc: 'US providers. No personal data.' },
    },
    experimental: 'Experimental',
    access: 'New accounts use sovereign. The lab enables EU on request.',
    codeLang: 'Programming language',
    copy: 'Copy',
    copied: 'Copied',
    baseUrl: 'Base URL',
    model: 'Model',
    prompt: 'Explain in two sentences what a language model is.',
    picked: 'Model {m} selected',
  },
}
