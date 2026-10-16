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
 * Light / dark / system switch of theme-locked builds (lib/theme-lock.ts), in
 * the udk.digital style: three 15px line icons as pressed-state buttons in a
 * labelled group, all three visible at once. Styles: `.theme-mode-switch` in
 * styles/theme-udk.css.
 */
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/context/theme-provider'
import { syncThemeColorMetas } from '@/lib/theme-lock'
import { cn } from '@/lib/utils'

const MODES = [
  { value: 'light', label: 'Light', icon: <SunIcon /> },
  { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
  { value: 'system', label: 'System', icon: <SystemIcon /> },
] as const

export function ThemeModeSwitch({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  useEffect(() => syncThemeColorMetas(theme), [theme])

  return (
    <div
      role='group'
      aria-label={t('Appearance')}
      className={cn('theme-mode-switch', className)}
    >
      {MODES.map((mode) => (
        <button
          key={mode.value}
          type='button'
          aria-pressed={theme === mode.value}
          aria-label={t(mode.label)}
          title={t(mode.label)}
          onClick={() => setTheme(mode.value)}
        >
          {mode.icon}
        </button>
      ))}
    </div>
  )
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox='0 0 15 15'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.4'
      strokeLinecap='square'
      aria-hidden='true'
      focusable='false'
    >
      {children}
    </svg>
  )
}

function SunIcon() {
  return (
    <Icon>
      <circle cx='7.5' cy='7.5' r='2.6' />
      <path d='M7.5 1v1.6M7.5 12.4V14M1 7.5h1.6M12.4 7.5H14M2.9 2.9 4 4M11 11l1.1 1.1M2.9 12.1 4 11M11 4l1.1-1.1' />
    </Icon>
  )
}

function MoonIcon() {
  return (
    <Icon>
      <path d='M12.8 9.3A5.6 5.6 0 0 1 5.7 2.2a5.6 5.6 0 1 0 7.1 7.1Z' />
    </Icon>
  )
}

function SystemIcon() {
  return (
    <Icon>
      <circle cx='7.5' cy='7.5' r='5.6' />
      <path d='M7.5 1.9v11.2a5.6 5.6 0 0 1 0-11.2Z' fill='currentColor' />
    </Icon>
  )
}
