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
 * Theme toggle of theme-locked builds (lib/theme-lock.ts), in the udk.digital
 * style: one button that morphs between moon and sun, the new theme opening as
 * a circle from it (design/theme-toggle in udk/infrastructure, copied to
 * lib/udk-theme-toggle.ts and styles/udk-theme-toggle.css). System stays the
 * default: toggling to what the system asks for stores "system" again.
 */
import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/context/theme-provider'
import { syncThemeColorMetas } from '@/lib/theme-lock'
import {
  revealTheme,
  systemTheme,
  type ResolvedTheme,
} from '@/lib/udk-theme-toggle'
import { cn } from '@/lib/utils'

import '@/styles/udk-theme-toggle.css'

export function ThemeModeSwitch({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { theme, resolvedTheme, setTheme } = useTheme()
  // The icon morphs only on a click, not when the page loads in dark.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setReady(true))
  }, [])
  useEffect(() => syncThemeColorMetas(theme), [theme])

  return (
    <button
      type='button'
      role='switch'
      aria-checked={resolvedTheme === 'dark'}
      aria-label={t('Dark')}
      title={t('Dark')}
      data-ready={ready || undefined}
      className={cn('theme-toggle', className)}
      onClick={(e) => {
        const next: ResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
        revealTheme(() => {
          // The provider applies the class in an effect; set it here as well so
          // the reveal captures the new theme synchronously.
          const root = document.documentElement
          root.classList.remove('light', 'dark')
          root.classList.add(next)
          flushSync(() => setTheme(next === systemTheme() ? 'system' : next))
        }, e.currentTarget)
      }}
    >
      <span>
        <i />
      </span>
    </button>
  )
}
