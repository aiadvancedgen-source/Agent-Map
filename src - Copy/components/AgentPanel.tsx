// Level 3: "The workflow, written down". A vertical timeline whose steps fill in one by one.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from 'lucide-react'
import { useMap } from '../context'
import type { Agent, Block, Department, Step } from '../types'
import { Chip, Icon, LiveChip, ToolTile } from './bits'

const TONE_COLOR: Record<string, string> = {
  good: 'var(--good)',
  problem: 'var(--problem)',
  neutral: 'var(--text-2)',
}

function BlockView({ block, approver }: { block: Block; approver: string }) {
  switch (block.type) {
    case 'text':
      return <p className="b-text">{block.text}</p>
    case 'message':
      return (
        <figure className="b-message">
          <figcaption>
            <span className="b-example">Example</span>
            <strong>{block.from}</strong>
            {block.to && (
              <>
                <span className="b-to">to</span>
                <strong>{block.to}</strong>
              </>
            )}
          </figcaption>
          <blockquote>{block.text}</blockquote>
        </figure>
      )
    case 'chat':
      return (
        <div className="b-chat">
          <span className="b-example">Example</span>
          {block.messages.map((m, i) => (
            <p key={i} className={`bubble bubble-${m.side}`}>
              {m.text}
            </p>
          ))}
        </div>
      )
    case 'rows':
      return (
        <ul className="b-rows">
          {block.rows.map((r, i) => (
            <li key={i}>
              <span className="b-row-label">{r.label}</span>
              {r.detail && <span className="b-row-detail">{r.detail}</span>}
              {r.chip && <Chip chip={r.chip} />}
            </li>
          ))}
        </ul>
      )
    case 'chips':
      return (
        <div className="b-chips">
          {block.chips.map((c, i) => (
            <Chip key={i} chip={c} />
          ))}
        </div>
      )
    case 'decision':
      return (
        <div className="b-decision">
          <div className="b-options">
            {block.options.map((o, i) => (
              <span key={i} className={i === 0 ? 'option option-primary' : 'option'}>
                {i === 0 && <Check size={14} aria-hidden />}
                {o}
              </span>
            ))}
          </div>
          <span className="b-by">
            <span className="avatar" aria-hidden>
              {(block.by ?? approver).charAt(0)}
            </span>
            {block.by ?? approver} decides
          </span>
        </div>
      )
  }
}

export function AgentPanel({ dept, agent }: { dept: Department; agent: Agent }) {
  const { client, go, reducedMotion } = useMap()
  const steps: Step[] = agent.workflow ?? []
  const [shown, setShown] = useState(reducedMotion ? steps.length : 0)
  const [run, setRun] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const userScrolled = useRef(false)
  const sheet = useRef<HTMLElement>(null)
  const color = client.color(dept)
  const approver = client.approverFor(dept)
  const tools = client.toolsFor(dept, agent)

  // Fill the steps in one at a time.
  useEffect(() => {
    if (reducedMotion) {
      setShown(steps.length)
      return
    }
    setShown(0)
    userScrolled.current = false
    scroller.current?.scrollTo({ top: 0 })
    let i = 0
    let timer: number
    const tick = () => {
      i += 1
      setShown(i)
      if (i < steps.length) timer = window.setTimeout(tick, 620)
    }
    timer = window.setTimeout(tick, 650)
    return () => window.clearTimeout(timer)
  }, [agent.id, run, reducedMotion, steps.length])

  // Follow the newest step unless the reader has taken over scrolling.
  useEffect(() => {
    if (reducedMotion || userScrolled.current || shown === 0) return
    const el = scroller.current?.querySelector(`[data-step="${shown - 1}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [shown, reducedMotion])

  useEffect(() => {
    sheet.current?.focus({ preventScroll: true })
  }, [agent.id])

  const flows = client.map.flows ?? []
  const allAgents = client.map.departments.flatMap((d) => d.agents.map((a) => ({ a, d })))
  const find = (id: string) => allAgents.find((x) => x.a.id === id)
  const outgoing = flows.filter((f) => f.from === agent.id && find(f.to))
  const incoming = flows.filter((f) => f.to === agent.id && find(f.from))

  return (
    <div className="sheet-wrap" onClick={() => go(dept.id)}>
      <motion.article
        className="sheet"
        ref={sheet}
        tabIndex={-1}
        style={{ '--c': color } as React.CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label={`${agent.name} workflow`}
        initial={reducedMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet-head">
          <button type="button" className="icon-btn" onClick={() => go(dept.id)} aria-label={`Back to ${dept.name}`}>
            <ArrowLeft size={18} strokeWidth={1.5} aria-hidden />
          </button>
          <span className="agent-icon agent-icon-lg">
            <Icon name={agent.icon} size={24} strokeWidth={1.5} />
          </span>
          <div className="sheet-title">
            <h2>{agent.name}</h2>
            <p className="crumb-caps">
              AI agent <i>·</i> {dept.name}
            </p>
          </div>
          <LiveChip status={agent.status} />
          <button type="button" className="icon-btn sheet-close" onClick={() => go()} aria-label="Close and return to the map">
            <X size={18} strokeWidth={1.5} aria-hidden />
          </button>
        </header>

        <div className="sheet-sub">
          <p className="sheet-role">{agent.role}</p>
          <div className="sheet-tools">
            {tools.map((t) => (
              <span key={t.id} className="tool-named">
                <ToolTile tool={t} size={26} />
                {!t.missing && !t.isClientLogo && <span>{t.name}</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="sheet-label">
          <span>The workflow, written down</span>
          {steps.length > 0 && (
            <button type="button" className="replay" onClick={() => setRun((r) => r + 1)}>
              <RotateCcw size={13} aria-hidden />
              Replay
            </button>
          )}
        </div>

        <div
          className="sheet-scroll"
          ref={scroller}
          onWheel={() => (userScrolled.current = true)}
          onTouchMove={() => (userScrolled.current = true)}
        >
          {steps.length === 0 ? (
            <p className="empty">This agent's steps have not been written down yet.</p>
          ) : (
            <ol className="timeline">
              {steps.map((step, i) => {
                const done = i < shown
                const stepColor = step.tone && step.tone !== 'accent' ? TONE_COLOR[step.tone] : 'var(--c)'
                const tool = step.tool ? client.tool(step.tool) : undefined
                return (
                  <li
                    key={i}
                    data-step={i}
                    className={`step ${done ? 'is-done' : 'is-pending'}`}
                    style={{ '--s': stepColor } as React.CSSProperties}
                  >
                    <span className="step-rail" aria-hidden>
                      <span className="step-ring">{done && <Check size={12} strokeWidth={3} />}</span>
                      {i < steps.length - 1 && <span className={`step-line ${i + 1 < shown ? 'is-on' : ''}`} />}
                    </span>
                    {done ? (
                      <motion.div
                        className="step-card"
                        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="step-top">
                          {tool && <ToolTile tool={tool} size={26} />}
                          <h3>{step.title}</h3>
                          {step.when && <span className="when">{step.when}</span>}
                        </div>
                        {step.body?.map((b, k) => <BlockView key={k} block={b} approver={approver} />)}
                      </motion.div>
                    ) : (
                      <div className="step-card step-slot" aria-hidden>
                        {step.when ?? `Step ${i + 1}`}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          )}

          <footer className="sheet-foot">
            <p className="approves">
              <span className="avatar" aria-hidden>
                {approver.charAt(0)}
              </span>
              Approved by {approver}
            </p>
            {(incoming.length > 0 || outgoing.length > 0) && (
              <div className="handoffs">
                {incoming.map((f) => {
                  const src = find(f.from)!
                  return (
                    <button
                      key={`in-${f.from}`}
                      type="button"
                      className="handoff"
                      style={{ '--c': client.color(src.d) } as React.CSSProperties}
                      onClick={() => go(src.d.id, src.a.id)}
                    >
                      <span className="handoff-kind">Receives</span>
                      <span className="handoff-label">{f.label}</span>
                      <span className="handoff-agent">from {src.a.name}</span>
                    </button>
                  )
                })}
                {outgoing.map((f) => {
                  const dst = find(f.to)!
                  return (
                    <button
                      key={`out-${f.to}`}
                      type="button"
                      className="handoff"
                      style={{ '--c': client.color(dst.d) } as React.CSSProperties}
                      onClick={() => go(dst.d.id, dst.a.id)}
                    >
                      <span className="handoff-kind">Hands off</span>
                      <span className="handoff-label">{f.label}</span>
                      <span className="handoff-agent">
                        to {dst.a.name} <ArrowRight size={13} aria-hidden />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </footer>
        </div>
      </motion.article>
    </div>
  )
}
