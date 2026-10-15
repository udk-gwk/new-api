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
 * Public model aliases of the UdK GenKI Lab gateway, by where the data is
 * processed. Source of truth: services/aliases.yaml in the udk-gwk
 * infrastructure repo. Signed-in visitors see the live list from
 * /api/pricing instead; this catalogue only fills in level and model name.
 */
export type Place = 'sovereign' | 'eu' | 'us'

export type CatalogModel = {
  id: string
  place: Place
  level: string
  name: string
  experimental?: boolean
}

export const PLACES: Place[] = ['sovereign', 'eu', 'us']

export const CATALOG: CatalogModel[] = [
  {
    id: 'sovereign-medium',
    place: 'sovereign',
    level: 'medium',
    name: 'Qwen 3.8 Flash',
  },
  {
    id: 'eu-medium',
    place: 'eu',
    level: 'medium',
    name: 'DeepSeek V4 Flash',
    experimental: true,
  },
  {
    id: 'eu-high',
    place: 'eu',
    level: 'high',
    name: 'GLM 5.3 Flash',
    experimental: true,
  },
  {
    id: 'eu-xhigh',
    place: 'eu',
    level: 'xhigh',
    name: 'Claude Opus 5.5',
    experimental: true,
  },
]

/** Place of a model id by its alias prefix, or null for raw upstream names. */
export function placeOf(id: string): Place | null {
  for (const place of PLACES) {
    if (id.startsWith(`${place}-`)) return place
  }
  return null
}

const LEVELS = ['medium', 'high', 'xhigh', 'max']
const levelRank = (id: string) => {
  const rank = LEVELS.indexOf(id.split('-')[1] ?? '')
  return rank < 0 ? LEVELS.length : rank
}

/** Merge the live model names with the catalogue; unknown aliases keep their id only. */
export function resolveModels(liveIds: string[] | null): CatalogModel[] {
  if (!liveIds) return CATALOG
  const byId = new Map(CATALOG.map((m) => [m.id, m]))
  return liveIds
    .filter((id) => placeOf(id) !== null)
    .sort((a, b) => levelRank(a) - levelRank(b) || a.localeCompare(b))
    .map(
      (id) =>
        byId.get(id) ?? {
          id,
          place: placeOf(id) as Place,
          level: id.split('-')[1] ?? '',
          name: '',
        }
    )
}
