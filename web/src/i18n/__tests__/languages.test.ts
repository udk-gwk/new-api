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

import {
  INTERFACE_LANGUAGE_OPTIONS,
  convertDetectedLanguage,
  normalizeInterfaceLanguage,
  toIntlLocale,
} from '../languages'

const LANGUAGE_CODES = INTERFACE_LANGUAGE_OPTIONS.map(
  (language) => language.code
)

describe('interface language codes', () => {
  test.each(LANGUAGE_CODES)(
    'normalizeInterfaceLanguage keeps the registered code %s',
    (code) => {
      expect(normalizeInterfaceLanguage(code)).toBe(code)
    }
  )

  test.each(LANGUAGE_CODES)(
    'toIntlLocale turns %s into a tag the Intl constructors accept',
    (code) => {
      const locale = toIntlLocale(code)
      expect(locale).toBeDefined()
      expect(() => new Intl.NumberFormat(locale)).not.toThrow()
    }
  )
})

describe('German language selection', () => {
  test('is offered in the interface language switcher', () => {
    expect(INTERFACE_LANGUAGE_OPTIONS).toContainEqual({
      code: 'de',
      label: 'Deutsch',
    })
  })

  test('passes browser-detected German tags through for supportedLngs matching', () => {
    expect(convertDetectedLanguage('de')).toBe('de')
    expect(convertDetectedLanguage('de-DE')).toBe('de-DE')
    expect(convertDetectedLanguage('de-AT')).toBe('de-AT')
  })

  test('maps the German code onto a BCP-47 tag for Intl formatting', () => {
    expect(toIntlLocale('de')).toBe('de')
  })
})
