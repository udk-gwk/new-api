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
 * Build-time theme lock.
 *
 * A build with `PUBLIC_THEME_LOCK=<preset>` (e.g. `udk`) pins every visitor
 * to that preset: stored preset, font, radius, scale and layout are ignored,
 * their writes are dropped, and the config drawer and quick switcher render
 * nothing. The mode (light / dark / system) stays the visitor's choice:
 * upstream's mode key in localStorage, system by default, and choosing system
 * removes the key (lib/theme-storage.ts). The mode switch renders as three
 * buttons (components/theme-mode-switch.tsx), and rsbuild.config.ts injects a
 * pre-paint script plus light/dark theme-color metas into index.html.
 * Without the variable the console behaves exactly like upstream.
 */
import { THEME_PRESET_VALUES, type ThemePreset } from './theme-customization'

const raw = typeof __THEME_LOCK__ === 'string' ? __THEME_LOCK__.trim() : ''

export const LOCKED_PRESET: ThemePreset | null = THEME_PRESET_VALUES.has(
  raw as ThemePreset
)
  ? (raw as ThemePreset)
  : null

export const isThemeLocked = LOCKED_PRESET !== null

/**
 * Keeps the `theme-color` metas that locked builds ship (one per
 * `prefers-color-scheme`, colour in `data-color`) in line with the mode:
 * system restores each meta's own colour, a forced mode writes that mode's
 * colour into both. Mirrors the pre-paint script in rsbuild.config.ts.
 */
export function syncThemeColorMetas(mode: 'light' | 'dark' | 'system'): void {
  if (typeof document === 'undefined') return
  const metas = [
    ...document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"][data-color]'
    ),
  ]
  const forced =
    mode === 'system'
      ? undefined
      : metas.find((meta) => meta.media.includes(mode))?.dataset.color
  for (const meta of metas) {
    const color = forced ?? meta.dataset.color
    if (color) meta.content = color
  }
}
