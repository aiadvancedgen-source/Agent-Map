// Finds every client folder and every logo file at build time.
// Adding a client = adding clients/<name>/map.json and its logo. No code changes.
import type { Agent, ClientMap, Department, ToolDef } from '../types'

const maps = import.meta.glob<ClientMap>('../../clients/*/map.json', { eager: true, import: 'default' })
const clientFiles = import.meta.glob<string>('../../clients/*/*.{png,svg,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
  query: '?url',
})
const logoFiles = import.meta.glob<string>('../../logos/*.{png,svg,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
  query: '?url',
})
const brandFiles = import.meta.glob<string>('../../brand/*.{png,svg,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
  query: '?url',
})

const PALETTE: Record<string, string> = {
  orange: '#f58e48',
  blue: '#4d9bfb',
  purple: '#9b83f5',
  gold: '#d9aa2b',
  pink: '#ec6a9c',
  cyan: '#45c3ea',
}

const stem = (path: string) => path.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase()

const toolLogos = new Map(Object.entries(logoFiles).map(([path, url]) => [stem(path), url]))

export const agencyLogo: string | undefined = Object.values(brandFiles)[0]

export const clientIds = Object.keys(maps)
  .map((p) => p.split('/').slice(-2)[0])
  .sort()

export interface ResolvedTool {
  id: string
  name: string
  /** Real logo file, if one exists. */
  logoUrl?: string
  /** True when the logo is the client's own (wide wordmark on its own background). */
  isClientLogo?: boolean
  /** Generic icon for things that are not a company. */
  icon?: string
  /** True when a logo was expected but no file was found. */
  missing: boolean
}

export interface LoadedClient {
  id: string
  map: ClientMap
  logoUrl?: string
  color: (dept: Department) => string
  tool: (id: string) => ResolvedTool
  toolsFor: (dept: Department, agent: Agent) => ResolvedTool[]
  approverFor: (dept: Department) => string
  agentCount: number
  toolCount: number
  workflowCount: number
  missingLogos: string[]
}

export function loadClient(id: string): LoadedClient | null {
  const entry = Object.entries(maps).find(([p]) => p.split('/').slice(-2)[0] === id)
  if (!entry) return null
  const map = entry[1]

  const logoEntry = Object.entries(clientFiles).find(
    ([p]) => p.split('/').slice(-2)[0] === id && p.endsWith('/' + map.client.logo),
  )
  const logoUrl = logoEntry?.[1]

  const tool = (toolId: string): ResolvedTool => {
    const def: ToolDef = map.tools[toolId] ?? { name: toolId, logo: toolId }
    if (def.icon) return { id: toolId, name: def.name, icon: def.icon, missing: false }
    if (def.logo === 'client') {
      return { id: toolId, name: def.name, logoUrl, isClientLogo: true, missing: !logoUrl }
    }
    const url = toolLogos.get((def.logo ?? toolId).toLowerCase())
    return { id: toolId, name: def.name, logoUrl: url, missing: !url }
  }

  const agents = map.departments.flatMap((d) => d.agents)
  const usedTools = new Set<string>()
  for (const d of map.departments) {
    for (const a of d.agents) {
      for (const t of a.tools ?? d.tools ?? []) usedTools.add(t)
      for (const s of a.workflow ?? []) if (s.tool) usedTools.add(s.tool)
    }
  }
  const missingLogos = [...usedTools]
    .map(tool)
    .filter((t) => t.missing)
    .map((t) => t.name)

  return {
    id,
    map,
    logoUrl,
    color: (dept) => PALETTE[dept.color] ?? dept.color,
    tool,
    toolsFor: (dept, agent) => (agent.tools ?? dept.tools ?? []).map(tool),
    approverFor: (dept) => dept.approver ?? map.approver,
    agentCount: agents.length,
    toolCount: usedTools.size,
    workflowCount: agents.filter((a) => (a.workflow?.length ?? 0) > 0).length,
    missingLogos,
  }
}
