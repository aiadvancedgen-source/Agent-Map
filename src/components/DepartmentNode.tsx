// A department panel: numbered badge, name, its agents with their tools, and who approves.
import type { NodeProps } from '@xyflow/react'
import { Bot, ChevronRight } from 'lucide-react'
import { useMap } from '../context'
import { panelHeight, PANEL_W } from '../layout/layout'
import { Icon, LiveChip, ToolTile } from './bits'

export function DepartmentNode({ data }: NodeProps) {
  const { client, deptId, go } = useMap()
  const id = (data as { deptId: string }).deptId
  const index = client.map.departments.findIndex((d) => d.id === id)
  const dept = client.map.departments[index]
  const selected = deptId === id
  const dim = !!deptId && !selected
  const approver = client.approverFor(dept)
  const n = dept.agents.length

  return (
    <section
      className={`dept ${selected ? 'is-selected' : ''} ${dim ? 'is-dim' : ''}`}
      style={{ '--c': client.color(dept), '--i': index, width: PANEL_W, height: panelHeight(dept) } as React.CSSProperties}
      role={selected ? undefined : 'button'}
      tabIndex={selected ? undefined : 0}
      aria-label={selected ? undefined : `${dept.name}, ${n} agents. Open department.`}
      onKeyDown={(e) => {
        if (!selected && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          go(id)
        }
      }}
    >
      <header className="dept-head">
        <span className="dept-badge">{String(index + 1).padStart(2, '0')}</span>
        <h2>{dept.name}</h2>
        <span className="dept-count">
          <Bot size={14} strokeWidth={1.5} aria-hidden />
          {n} {n === 1 ? 'agent' : 'agents'}
        </span>
      </header>

      <ul className="agents">
        {dept.agents.map((agent) => {
          const body = (
            <>
              <span className="agent-icon">
                <Icon name={agent.icon} size={19} strokeWidth={1.5} />
              </span>
              <span className="agent-text">
                <span className="agent-name">{agent.name}</span>
                <span className="agent-role">{agent.role}</span>
                <span className="agent-tools">
                  {client.toolsFor(dept, agent).map((t) => (
                    <ToolTile key={t.id} tool={t} size={24} />
                  ))}
                </span>
              </span>
              <span className="agent-side">
                <LiveChip status={agent.status} />
                {selected && <ChevronRight size={16} strokeWidth={1.5} aria-hidden className="agent-go" />}
              </span>
            </>
          )
          return (
            <li key={agent.id}>
              {selected ? (
                <button type="button" className="agent-row nodrag nopan" onClick={() => go(id, agent.id)}>
                  {body}
                </button>
              ) : (
                <div className="agent-row">{body}</div>
              )}
            </li>
          )
        })}
      </ul>

      <footer className="dept-foot">
        <span className="avatar" aria-hidden>
          {approver.charAt(0)}
        </span>
        {approver} approves
      </footer>
    </section>
  )
}
