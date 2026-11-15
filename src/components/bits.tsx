// Small shared pieces: icons by name, tool logo tiles, chips.
import { icons, type LucideProps } from 'lucide-react'
import type { ResolvedTool } from '../data/loadClient'
import type { ChipDef } from '../types'

const pascal = (name: string) =>
  name
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')

export function Icon({ name, ...props }: { name?: string } & LucideProps) {
  const Cmp = (name && icons[pascal(name) as keyof typeof icons]) || icons.Bot
  return <Cmp aria-hidden {...props} />
}

/**
 * A tool's logo. Only real files are ever shown as logos:
 * - a logo file from /logos, on a white tile
 * - the client's own logo, on a dark tile
 * - a generic icon for things that are not a company
 * - otherwise a dashed, labelled placeholder
 */
export function ToolTile({ tool, size = 28 }: { tool: ResolvedTool; size?: number }) {
  const style = { '--tile': `${size}px` } as React.CSSProperties
  if (tool.icon) {
    return (
      <span className="tile tile-icon" style={style} title={tool.name}>
        <Icon name={tool.icon} size={size * 0.58} strokeWidth={1.5} />
        <span className="sr-only">{tool.name}</span>
      </span>
    )
  }
  if (tool.logoUrl) {
    return (
      <span className={tool.isClientLogo ? 'tile tile-client' : 'tile tile-logo'} style={style} title={tool.name}>
        <img src={tool.logoUrl} alt={tool.name} draggable={false} />
      </span>
    )
  }
  return (
    <span className="tile tile-missing" style={style} title={`${tool.name}: logo file missing`}>
      {tool.name}
    </span>
  )
}

export function Chip({ chip }: { chip: ChipDef }) {
  return <span className={`chip chip-${chip.tone ?? 'neutral'}`}>{chip.text}</span>
}

export function LiveChip({ status = 'live' }: { status?: 'live' | 'building' | 'planned' | 'shipped' }) {
  if (status === 'building') return <span className="chip chip-accent chip-live chip-building">in build</span>
  if (status === 'shipped') return <span className="chip chip-good chip-live">shipped</span>
  if (status === 'planned') return <span className="chip chip-neutral chip-live chip-planned">planned</span>
  return (
    <span className="chip chip-good chip-live">
      <i aria-hidden />
      live
    </span>
  )
}
