// Copy of udk/infrastructure design/theme-toggle/theme-toggle.ts, written by tools/sync-udk-theme-toggle.ts.
// Edit the original there and re-run the sync; changes made here are overwritten.
// udk.digital theme toggle: one button whose line icon turns from moon to sun, after Aaron
// Iker's "Dark / Light mode toggle" (codepen.io/aaroniker/pen/raaMMGx), drawn in the udk.digital
// icon style (15px, 1.4px stroke, square caps, currentColor): a crescent moon that turns into a
// round sun with rays. The new theme opens as a square from the button, like the grid (View
// Transitions API); browsers without it, and visitors who ask for reduced motion, switch at once.
//
// Two states, light and dark. System stays the default: no choice is stored until someone
// toggles, and toggling to the theme the system already asks for removes the choice again.
//
// Styles: theme-toggle.css. Distributed by tools/sync-udk-theme-toggle.ts (stt and tts inline,
// GenKI website and the new-api fork as copies). Edit here, then re-run the sync.

export type ResolvedTheme = 'light' | 'dark'

export interface ThemeOptions {
  /** localStorage key of the stored choice, e.g. `udk-theme`. */
  key: string
  /** Browser bar colour per theme; must match the page's --bg token. */
  colors?: Record<ResolvedTheme, string>
}

const COLORS: Record<ResolvedTheme, string> = { light: '#ffffff', dark: '#0f0f0f' }

/** The icon, the toggle's only content. Moon for light (click for dark), sun for dark; the
 *  morph between them is CSS on .tt-moon, .tt-sun and .tt-rays (theme-toggle.css). */
export const themeToggleIcon =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" aria-hidden="true" focusable="false">' +
  '<path class="tt-moon" d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z"/>' +
  '<g class="tt-sun"><circle cx="8" cy="8" r="3"/>' +
  '<path class="tt-rays" d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"/></g>' +
  '</svg>'

/** What the system asks for, ignoring any stored choice. */
export function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** The theme the page shows now: a forced data-theme, otherwise the system's. */
export function currentTheme(): ResolvedTheme {
  const t = document.documentElement.dataset.theme
  return t === 'light' || t === 'dark' ? t : systemTheme()
}

/** Runs `apply` (which must change the DOM synchronously) inside a circular reveal that
 *  starts at the centre of `origin`. */
export function revealTheme(apply: () => void, origin?: Element | null): void {
  const root = document.documentElement
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const start = (document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } })
    .startViewTransition
  if (!start || reduce) {
    apply()
    return
  }
  const r = origin?.getBoundingClientRect()
  root.style.setProperty('--theme-x', `${r ? r.left + r.width / 2 : window.innerWidth / 2}px`)
  root.style.setProperty('--theme-y', `${r ? r.top + r.height / 2 : window.innerHeight / 2}px`)
  // Scoped, so the page's other view transitions (if any) keep their own animation.
  root.classList.add('theme-revealing')
  // finished also rejects when the browser skips the transition; either way the class goes.
  start
    .call(document, apply)
    .finished.catch(() => undefined)
    .finally(() => root.classList.remove('theme-revealing'))
    .catch(() => undefined)
}

/** Pages that theme by `data-theme` on <html>: sets it (or clears it when the system already
 *  asks for `next`), stores or drops the choice, and keeps the theme-color metas in step. */
export function applyStoredTheme(next: ResolvedTheme, { key, colors = COLORS }: ThemeOptions): void {
  const root = document.documentElement
  const system = next === systemTheme()
  if (system) delete root.dataset.theme
  else root.dataset.theme = next
  try {
    if (system) localStorage.removeItem(key)
    else localStorage.setItem(key, next)
  } catch {
    // Private mode or blocked storage: the choice holds for this page view only.
  }
  // Without a choice the metas follow their own media queries; a choice overrides both.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const own: ResolvedTheme = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = colors[system ? own : next]
  })
}

/** Keeps a toggle button's state (`aria-checked`, true = dark) in step with the page. */
export function syncToggle(button: HTMLElement, theme: ResolvedTheme = currentTheme()): void {
  button.setAttribute('aria-checked', String(theme === 'dark'))
  // The icon morphs only on a click, not when the page loads in dark.
  if (!button.dataset.ready) requestAnimationFrame(() => (button.dataset.ready = 'true'))
}

/** Plain pages: wires a `<button class="theme-toggle" role="switch">` to the stored theme and
 *  draws its icon. */
export function mountThemeToggle(button: HTMLElement, options: ThemeOptions): void {
  button.innerHTML = themeToggleIcon
  syncToggle(button)
  button.addEventListener('click', () => {
    const next: ResolvedTheme = currentTheme() === 'dark' ? 'light' : 'dark'
    revealTheme(() => {
      applyStoredTheme(next, options)
      syncToggle(button, next)
    }, button)
  })
  // No choice stored: follow the system live.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => syncToggle(button))
}
