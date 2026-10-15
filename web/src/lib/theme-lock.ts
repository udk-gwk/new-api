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
 * to that preset in light mode: stored preferences are ignored, writes are
 * dropped, and the theme controls (config drawer, quick switcher, mode
 * switch, command-menu theme group) render nothing. Without the variable the
 * console behaves exactly like upstream.
 */
import { THEME_PRESET_VALUES, type ThemePreset } from './theme-customization'

const raw = typeof __THEME_LOCK__ === 'string' ? __THEME_LOCK__.trim() : ''

export const LOCKED_PRESET: ThemePreset | null = THEME_PRESET_VALUES.has(
  raw as ThemePreset
)
  ? (raw as ThemePreset)
  : null

export const isThemeLocked = LOCKED_PRESET !== null
