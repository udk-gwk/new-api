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
import { describe, expect, test } from 'vitest'

import { INTERFACE_LANGUAGE_OPTIONS } from '../languages'
import deBundle from '../locales/de.json'
import enBundle from '../locales/en.json'
import frBundle from '../locales/fr.json'
import jaBundle from '../locales/ja.json'
import ruBundle from '../locales/ru.json'
import viBundle from '../locales/vi.json'
import zhTWBundle from '../locales/zh-TW.json'
import zhCNBundle from '../locales/zh.json'

type Translation = Record<string, string>

// Keyed by the i18next language codes registered in `languages.ts` / `config.ts`.
const TRANSLATIONS: Record<string, Translation> = {
  en: enBundle.translation,
  zhCN: zhCNBundle.translation,
  de: deBundle.translation,
  fr: frBundle.translation,
  ru: ruBundle.translation,
  ja: jaBundle.translation,
  vi: viBundle.translation,
  zhTW: zhTWBundle.translation,
}

const ENGLISH: Translation = enBundle.translation
const GERMAN: Translation = deBundle.translation
const SOURCE_KEYS = Object.keys(ENGLISH)
const LANGUAGE_CODES = INTERFACE_LANGUAGE_OPTIONS.map(
  (language) => language.code
)

function interpolationPlaceholders(value: string): string {
  return [...value.matchAll(/\{\{[^}]*\}\}/g)]
    .map((match) => match[0])
    .sort()
    .join('|')
}

describe('interface locale bundles', () => {
  test.each(LANGUAGE_CODES)('ships a bundle for language %s', (code) => {
    expect(TRANSLATIONS[code]).toBeDefined()
  })

  test.each(LANGUAGE_CODES)(
    'covers every English source key in %s so no string falls back mid-page',
    (code) => {
      const translation = TRANSLATIONS[code]
      const missing = SOURCE_KEYS.filter(
        (key) => !Object.hasOwn(translation, key)
      )
      expect(missing).toEqual([])
    }
  )
})

describe('German locale bundle', () => {
  test('keeps every i18next interpolation placeholder from the English source', () => {
    const mismatched = SOURCE_KEYS.filter(
      (key) =>
        interpolationPlaceholders(ENGLISH[key]) !==
        interpolationPlaceholders(GERMAN[key])
    )
    expect(mismatched).toEqual([])
  })

  test('translates prose instead of echoing the English source key', () => {
    expect(GERMAN['Save Changes']).toBe('Änderungen speichern')
    expect(GERMAN['Insufficient balance']).toBe('Unzureichendes Guthaben')
    expect(GERMAN['Language Preferences']).toBe('Spracheinstellungen')
  })
})
