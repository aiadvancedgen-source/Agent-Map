// The shape of clients/<name>/map.json. Everything client-specific lives in that file.

export type Tone = 'good' | 'problem' | 'neutral' | 'accent'

export interface ChipDef {
  text: string
  tone?: Tone
}

/** One piece of concrete content inside a workflow step. */
export type Block =
  | { type: 'text'; text: string }
  | { type: 'message'; from: string; to?: string; text: string }
  | { type: 'chat'; messages: { side: 'them' | 'agent'; text: string }[] }
  | { type: 'rows'; rows: { label: string; detail?: string; chip?: ChipDef }[] }
  | { type: 'chips'; chips: ChipDef[] }
  | { type: 'decision'; options: string[]; by?: string }

export interface Step {
  title: string
  /** Short timing tag shown on the right, e.g. "DAY 1". */
  when?: string
  /** Tool id whose logo sits on the step. */
  tool?: string
  /** Ring colour meaning. Defaults to the department colour. */
  tone?: Tone
  body?: Block[]
}

export interface Agent {
  id: string
  name: string
  role: string
  /** Lucide icon name in kebab-case, e.g. "funnel". */
  icon?: string
  /** Overrides the department's tools. */
  tools?: string[]
  /** Build state shown on the badge. Defaults to live. */
  status?: 'live' | 'building' | 'planned' | 'shipped'
  workflow?: Step[]
}

export interface Department {
  id: string
  name: string
  /** A palette name (orange, blue, purple, gold, pink, cyan) or a hex colour. */
  color: string
  tools?: string[]
  /** Overrides the map-level approver. */
  approver?: string
  agents: Agent[]
}

export interface ToolDef {
  name: string
  /** File name (without extension) in /logos. Use "client" for the client's own logo. */
  logo?: string
  /** Lucide icon name for things that are not a company, e.g. "server". */
  icon?: string
}

export interface Flow {
  from: string
  to: string
  label: string
}

export interface ClientMap {
  client: { name: string; logo: string }
  hub: { title: string; kicker?: string }
  approver: string
  tools: Record<string, ToolDef>
  departments: Department[]
  flows?: Flow[]
}
