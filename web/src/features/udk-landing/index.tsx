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

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
/**
 * Landing page of the UdK GenKI Lab gateway (udk.digital page style), shown
 * at `/` in builds locked to the `udk` preset. Three steps: get a key, pick a
 * model, copy the code; picking a model rewrites the code at once.
 * Texts live here (DE/EN) rather than in the locale files, so upstream's
 * i18n parity checks stay untouched.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ThemeModeSwitch } from '@/components/theme-mode-switch'
import { getPricing } from '@/features/pricing/api'
import { openUdkChat } from '@/lib/udk-chat'
import { useAuthStore } from '@/stores/auth-store'

import { PLACES, resolveModels } from './catalog'
import { mountHero, PALETTES } from './genki-hero'
import { TEXT, type Lang } from './text'

import './udk-landing.css'

type Tab = 'curl' | 'python' | 'js'

const BASE_URL = 'https://api.udk.digital/v1'

function snippet(tab: Tab, model: string, prompt: string): string {
  const p = prompt.replaceAll('"', '\\"')
  if (tab === 'python') {
    return `from openai import OpenAI

client = OpenAI(
    base_url="${BASE_URL}",
    api_key="sk-…",
)

reply = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "${p}"}],
)
print(reply.choices[0].message.content)`
  }
  if (tab === 'js') {
    return `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${BASE_URL}",
  apiKey: process.env.UDK_API_KEY,
});

const reply = await client.chat.completions.create({
  model: "${model}",
  messages: [{ role: "user", content: "${p}" }],
});
console.log(reply.choices[0].message.content);`
  }
  return `curl ${BASE_URL}/chat/completions \\
  -H "Authorization: Bearer $UDK_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "${p.replaceAll("'", "'\\''")}"}]
  }'`
}

export function UdkLanding() {
  const { i18n } = useTranslation()
  const lang: Lang = i18n.language?.toLowerCase().startsWith('de') ? 'de' : 'en'
  const t = TEXT[lang]
  const user = useAuthStore((s) => s.auth.user)

  // Signed-in visitors get the models their account can really use.
  const pricing = useQuery({
    queryKey: ['udk-landing', 'pricing', user?.id ?? null],
    queryFn: getPricing,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
  const liveIds = pricing.data?.success
    ? pricing.data.data.map((m) => m.model_name)
    : null
  const models = useMemo(() => resolveModels(liveIds), [liveIds])

  const [model, setModel] = useState('sovereign-medium')
  const [tab, setTab] = useState<Tab>('curl')
  const [copied, setCopied] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (models.length && !models.some((m) => m.id === model)) {
      setModel(models[0].id)
    }
  }, [models, model])

  useEffect(() => {
    document.title = t.pageTitle
  }, [t.pageTitle])

  // Pixel-sort hero behind the sidebar, in shades of the api yellow.
  const heroRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!heroRef.current) return
    const hero = mountHero(heroRef.current, { colors: PALETTES.api })
    return () => hero.destroy()
  }, [])

  const code = snippet(tab, model, t.prompt)

  const pick = (id: string) => {
    setModel(id)
    setAnnouncement(t.picked.replace('{m}', id))
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setAnnouncement(t.copied)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked: the code stays selectable in the block below.
    }
  }

  const places = PLACES.filter((p) => models.some((m) => m.place === p))

  return (
    <div className='udk-landing'>
      <div className='udk-grid udk-shiver'>
        <aside className='udk-tile udk-sidebar'>
          <canvas className='udk-sidebar-bg' ref={heroRef} aria-hidden='true' />
          <div className='udk-sidebar-top'>
            <a
              className='udk-label udk-label-dark udk-brand'
              href='https://udk.digital'
            >
              GenKI Lab
            </a>
            <div className='udk-switches'>
              <div
                className='udk-lang'
                role='group'
                aria-label='Sprache / Language'
              >
                {(['de', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    type='button'
                    aria-pressed={lang === l}
                    onClick={() => void i18n.changeLanguage(l)}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <ThemeModeSwitch />
            </div>
          </div>

          <div className='udk-sidebar-main'>
            <h1>{t.title}</h1>
            <p>{t.purpose}</p>

            <dl className='udk-stats'>
              <div>
                <dt>{models.length}</dt>
                <dd>{t.statModels}</dd>
              </div>
              <div>
                <dt>{places.length}</dt>
                <dd>{t.statPlaces}</dd>
              </div>
            </dl>

            <div className='udk-cta'>
              {user ? (
                <Link className='udk-btn udk-btn-primary' to='/dashboard'>
                  {t.console}
                  <Arrow />
                </Link>
              ) : (
                <Link className='udk-btn udk-btn-primary' to='/sign-in'>
                  {t.signIn}
                  <Arrow />
                </Link>
              )}
            </div>
            {user && (
              <p className='udk-signed-in'>
                {t.signedInAs}{' '}
                <strong>{user.display_name || user.username}</strong>
              </p>
            )}

            <p className='udk-note'>{t.dataNote}</p>
          </div>

          <div className='udk-sidebar-foot'>
            <span className='udk-label'>api.udk.digital · {t.compat}</span>
            <div className='udk-foot-links'>
              <a href='https://onboard.udk.digital/doc/apiudkdigital-UffkkddWGn'>
                {t.docs}
              </a>
              <a
                href='https://onboard.udk.digital'
                onClick={(e) => {
                  if (openUdkChat()) e.preventDefault()
                }}
              >
                {t.help}
              </a>
            </div>
          </div>
        </aside>

        <main className='udk-work'>
          <section className='udk-tile udk-step' aria-labelledby='udk-h-key'>
            <div className='udk-step-head'>
              <h2 className='udk-label udk-label-dark' id='udk-h-key'>
                {t.stepKey}
              </h2>
              <span className='udk-step-num'>01</span>
            </div>
            <ol className='udk-howto'>
              <li>
                <strong>{t.how1}</strong>
                <span>{t.how1d}</span>
              </li>
              <li>
                <strong>
                  {user ? <Link to='/keys'>{t.how2}</Link> : t.how2}
                </strong>
                <span>{t.how2d}</span>
              </li>
              <li>
                <strong>{t.how3}</strong>
                <span>{t.how3d}</span>
              </li>
            </ol>
          </section>

          <section
            className='udk-tile udk-step udk-grow'
            aria-labelledby='udk-h-models'
          >
            <div className='udk-step-head'>
              <h2 className='udk-label udk-label-dark' id='udk-h-models'>
                {t.stepModels}
              </h2>
              <span className='udk-step-num'>02</span>
            </div>
            <div className='udk-places'>
              {places.map((place) => (
                <div className='udk-place' key={place}>
                  <div className='udk-place-head'>
                    <span className='udk-label udk-label-dark'>
                      {t.places[place].name}
                    </span>
                    <span>{t.places[place].desc}</span>
                  </div>
                  <div className='udk-models'>
                    {models
                      .filter((m) => m.place === place)
                      .map((m) => (
                        <button
                          key={m.id}
                          type='button'
                          className='udk-model'
                          aria-pressed={m.id === model}
                          onClick={() => pick(m.id)}
                        >
                          <span className='udk-model-id'>{m.id}</span>
                          <span className='udk-model-meta'>
                            {m.level && (
                              <span className='udk-badge'>{m.level}</span>
                            )}
                            {m.name && <span>{m.name}</span>}
                            {m.experimental && (
                              <span className='udk-badge'>
                                {t.experimental}
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <p className='udk-access'>{t.access}</p>
          </section>

          <section
            className='udk-tile udk-step udk-grow udk-tinted'
            aria-labelledby='udk-h-code'
          >
            <div className='udk-step-head'>
              <h2 className='udk-label udk-label-dark' id='udk-h-code'>
                {t.stepCode}
              </h2>
              <span className='udk-step-num'>03</span>
            </div>
            <div className='udk-code-row'>
              <div className='udk-seg' role='group' aria-label={t.codeLang}>
                {(
                  [
                    ['curl', 'curl'],
                    ['python', 'Python'],
                    ['js', 'JavaScript'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type='button'
                    aria-pressed={tab === id}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button type='button' className='udk-btn-text' onClick={copy}>
                {copied ? t.copied : t.copy}
              </button>
            </div>
            <pre tabIndex={0} aria-labelledby='udk-h-code'>
              {code}
            </pre>
            <div className='udk-base'>
              <span>
                {t.baseUrl} <code>{BASE_URL}</code>
              </span>
              <span>
                {t.model} <code>{model}</code>
              </span>
            </div>
          </section>
        </main>
      </div>
      <div className='udk-sr-only' aria-live='polite'>
        {announcement}
      </div>
    </div>
  )
}

function Arrow() {
  return (
    <svg
      viewBox='0 0 16 16'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='square'
      aria-hidden='true'
    >
      <path d='M2 8h11M9 4l4 4-4 4' />
    </svg>
  )
}
