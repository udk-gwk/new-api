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
import { LOCKED_PRESET } from './theme-lock'

export const THEME_STORAGE_KEYS = {
  mode: 'newapi:theme:v1:mode',
  preset: 'newapi:theme:v1:preset',
  font: 'newapi:theme:v1:font',
  radius: 'newapi:theme:v1:radius',
  scale: 'newapi:theme:v1:scale',
  contentLayout: 'newapi:theme:v1:content-layout',
} as const

// With a build-time theme lock (lib/theme-lock.ts) these values win over
// anything stored, and writes are dropped.
const LOCKED_PREFERENCES: Readonly<Record<string, string>> =
  LOCKED_PRESET === null
    ? {}
    : {
        [THEME_STORAGE_KEYS.mode]: 'light',
        [THEME_STORAGE_KEYS.preset]: LOCKED_PRESET,
        [THEME_STORAGE_KEYS.font]: 'default',
        [THEME_STORAGE_KEYS.radius]: 'default',
        [THEME_STORAGE_KEYS.scale]: 'default',
        [THEME_STORAGE_KEYS.contentLayout]: 'full',
      }

export function readThemePreference<T extends string>(
  key: string,
  allowed: ReadonlySet<T>,
  fallback: T
): T {
  const locked = LOCKED_PREFERENCES[key]
  if (locked !== undefined && allowed.has(locked as T)) return locked as T
  if (typeof window === 'undefined') return fallback

  try {
    // Legacy cookies are shared across ports, so importing them would restore
    // preferences that may belong to another local instance.
    const value = window.localStorage.getItem(key)
    return value && allowed.has(value as T) ? (value as T) : fallback
  } catch {
    return fallback
  }
}

export function writeThemePreference(key: string, value: string | null): void {
  if (LOCKED_PRESET !== null) return
  if (typeof window === 'undefined') return

  try {
    if (value === null) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, value)
    }
  } catch {
    // Keep theme controls usable when storage is blocked or full.
  }
}
