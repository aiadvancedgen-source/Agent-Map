// Agent Map engine. Reads clients/<name>/map.json and draws the three levels:
// the map, a department, an agent's workflow.
// Choose a client with ?client=<folder name>. Deep links: #/<department>/<agent>.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AnimatePresence } from 'motion/react'
import { ArrowLeft, Bot } from 'lucide-react'
import { MapContext } from './context'
import { agencyLogo, clientIds, loadClient } from './data/loadClient'
import { layoutMap, type MapLayout } from './layout/layout'
import { AgentPanel } from './components/AgentPanel'
import { MapCanvas } from './components/MapCanvas'
import { LiveChip } from './components/bits'

const readHash = () => {
  const [deptId, agentId] = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  return { deptId, agentId }
}

const useMedia = (query: string) => {
  const [on, setOn] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const fn = () => setOn(m.matches)
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [query])
  return on
}

export default function App() {
  const clientId = new URLSearchParams(window.location.search).get('client') ?? clientIds[0]
  const client = useMemo(() => (clientId ? loadClient(clientId) : null), [clientId])
  const portrait = useMedia('(max-aspect-ratio: 1/1)')
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)')
  const [layout, setLayout] = useState<MapLayout | null>(null)
  const [route, setRoute] = useState(readHash)

  useEffect(() => {
    const fn = () => setRoute(readHash())
    window.addEventListener('hashchange', fn)
    return () => window.removeEventListener('hashchange', fn)
  }, [])

  useEffect(() => {
    if (!client) return
    let live = true
    layoutMap(client.map, portrait).then((l) => live && setLayout(l))
    return () => {
      live = false
    }
  }, [client, portrait])

  useEffect(() => {
    if (!client) return
    document.title = `${client.map.hub.title} · Agent Map`
    if (client.missingLogos.length) {
      console.info(`[Agent Map] Logo files missing in /logos: ${client.missingLogos.join(', ')}`)
    }
  }, [client])

  const go = useCallback((deptId?: string, agentId?: string) => {
    const next = deptId ? `#/${deptId}${agentId ? `/${agentId}` : ''}` : '#/'
    if (window.location.hash !== next) window.location.hash = next
  }, [])

  const dept = client?.map.departments.find((d) => d.id === route.deptId)
  const agent = dept?.agents.find((a) => a.id === route.agentId)

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (agent && dept) go(dept.id)
      else if (dept) go()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [agent, dept, go])

  if (!client) {
    return (
      <main className="notice">
        <h1>No client map found</h1>
        <p>
          {clientId ? `There is no clients/${clientId}/map.json.` : 'Add a folder under clients/ with a map.json.'}
          {clientIds.length > 0 && ` Available: ${clientIds.join(', ')}.`}
        </p>
      </main>
    )
  }
  if (!layout) return <main className="notice" aria-busy="true" />

  const { map } = client
  const level = agent ? 3 : dept ? 2 : 1

  return (
    <MapContext.Provider
      value={{ client, layout, deptId: dept?.id, agentId: agent?.id, reducedMotion, go }}
    >
      <div className={`app level-${level}`}>
        <div className="aurora" aria-hidden />
        <div className="vignette" aria-hidden />
        <ReactFlowProvider>
          <MapCanvas />
        </ReactFlowProvider>

        <header className="top">
          <nav className="crumbs island" aria-label="Where you are">
            {level > 1 && (
              <button
                type="button"
                className="icon-btn"
                onClick={() => (agent && dept ? go(dept.id) : go())}
                aria-label={agent && dept ? `Back to ${dept.name}` : 'Back to the map'}
              >
                <ArrowLeft size={18} strokeWidth={1.5} aria-hidden />
              </button>
            )}
            <button type="button" className="crumb" onClick={() => go()} aria-current={level === 1 ? 'page' : undefined}>
              Map
            </button>
            {dept && (
              <>
                <span aria-hidden>/</span>
                <button
                  type="button"
                  className="crumb"
                  style={{ color: client.color(dept) }}
                  onClick={() => go(dept.id)}
                  aria-current={level === 2 ? 'page' : undefined}
                >
                  {dept.name}
                </button>
              </>
            )}
            {agent && (
              <>
                <span aria-hidden>/</span>
                <span className="crumb" aria-current="page">
                  {agent.name}
                </span>
              </>
            )}
          </nav>

          <div className="masthead" aria-hidden={level > 1}>
            <p className="eyebrow island">
              {agencyLogo && <span className="eyebrow-mark" style={{ backgroundImage: `url(${agencyLogo})` }} />}
              {map.hub.kicker ?? 'Agent map'}
            </p>
            <h1>{map.hub.title}</h1>
            <p className="stats island">
              <span>
                <LiveChip />
              </span>
              <span>
                <b>{map.departments.length}</b> departments
              </span>
              <span>
                <b>{client.agentCount}</b> agents
              </span>
              {(() => {
                const live = map.departments.flatMap((d) => d.agents).filter((a) => (a.status ?? 'live') === 'live').length
                return live < client.agentCount ? (
                  <span>
                    <b>{live}</b> live
                  </span>
                ) : null
              })()}
              <span>
                <b>
                  {client.workflowCount}/{client.agentCount}
                </b>{' '}
                workflows written down
              </span>
              <span>
                <b>{client.toolCount}</b> tools
              </span>
            </p>
          </div>
        </header>

        {level === 1 && <p className="hint">Tap a department to open it</p>}

        {dept && level === 2 && (
          <div className="dept-pill island" style={{ '--c': client.color(dept) } as React.CSSProperties}>
            <strong>{dept.name}</strong>
            <span>
              <Bot size={15} strokeWidth={1.5} aria-hidden />
              {dept.agents.length} AI {dept.agents.length === 1 ? 'agent' : 'agents'}
            </span>
            <em>Tap an agent to see its workflow</em>
          </div>
        )}

        {agencyLogo && (
          <p className="built-by island">
            <span className="built-logo" style={{ backgroundImage: `url(${agencyLogo})` }} aria-hidden />
            Built by AI Advanced Gen
          </p>
        )}

        <div className="grain" aria-hidden />
        <AnimatePresence>{agent && dept && <AgentPanel key={agent.id} dept={dept} agent={agent} />}</AnimatePresence>
      </div>
    </MapContext.Provider>
  )
}
