// The centre of the map. The agency's mark sits at the exact centre as the
// engine, the client it is built for sits beneath it, and the agent count above.
// Around them: one numbered ring per department with a fan of spokes (one spoke
// per agent), and the coloured right-angle lines out to each department.
import { useEffect, useMemo, useState } from 'react'
import { animate } from 'motion'
import { useMap } from '../context'
import { agencyLogo } from '../data/loadClient'
import { RING_R } from '../layout/layout'

// Small deterministic random generator so the particle cloud never changes between renders.
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const two = (n: number) => String(n).padStart(2, '0')

export function HubNode() {
  const { client, layout, deptId, reducedMotion } = useMap()
  const { hub, lines, links } = layout
  const depts = client.map.departments
  const cx = hub.w / 2
  const cy = hub.h / 2
  // Everything in the layout is in map coordinates; this node sits at the hub's corner.
  const ox = -hub.x
  const oy = -hub.y

  const [count, setCount] = useState(reducedMotion ? client.agentCount : 0)
  useEffect(() => {
    if (reducedMotion) {
      setCount(client.agentCount)
      return
    }
    const controls = animate(0, client.agentCount, {
      duration: 1.6,
      delay: 0.5,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (v) => setCount(Math.round(v)),
    })
    return () => controls.stop()
  }, [client.agentCount, reducedMotion])

  const particles = useMemo(() => {
    const rand = rng(7)
    const colors = ['#ffffff', '#ffffff', ...depts.map((d) => client.color(d))]
    return Array.from({ length: 170 }, (_, i) => {
      const a = rand() * Math.PI * 2
      const r = 70 + Math.pow(rand(), 0.8) * (RING_R - 40)
      return {
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        r: 0.5 + rand() * 1.2,
        o: 0.12 + rand() * 0.5,
        c: colors[i % colors.length],
        d: rand() * 6,
      }
    })
  }, [cx, cy, depts, client])

  const pillFor = (targetDept: string) =>
    links.filter((l) => !l.path && l.to === targetDept).flatMap((l) => l.labels)

  return (
    <div className={`hub ${deptId ? 'is-dim' : ''}`} style={{ width: hub.w, height: hub.h }}>
      <div className="hub-sweep" style={{ width: RING_R * 2, height: RING_R * 2 }} aria-hidden />
      <svg className="hub-art" width={hub.w} height={hub.h} aria-hidden>
        <defs>
          <radialGradient id="hub-glow">
            <stop offset="0" stopColor="#6f7dff" stopOpacity="0.22" />
            <stop offset="0.55" stopColor="#6f7dff" stopOpacity="0.06" />
            <stop offset="1" stopColor="#6f7dff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="arc-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#8f9bff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={RING_R + 60} fill="url(#hub-glow)" />

        {/* Instrument rings */}
        <g className="orbits">
          <circle cx={cx} cy={cy} r={RING_R} className="orbit orbit-main" />
          <circle cx={cx} cy={cy} r={RING_R - 34} className="orbit orbit-ticks" />
          <circle cx={cx} cy={cy} r={RING_R - 62} className="orbit orbit-thin" />
          <g className="spin-slow" style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <circle cx={cx} cy={cy} r={RING_R - 62} className="orbit orbit-arc" stroke="url(#arc-grad)" />
          </g>
          <g className="spin-rev" style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <circle cx={cx} cy={cy} r={RING_R + 26} className="orbit orbit-dash" />
          </g>
        </g>

        <g className="particles">
          {particles.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.c} opacity={p.o} style={{ animationDelay: `${p.d}s` }} />
          ))}
        </g>

        {/* Direct connectors between neighbouring departments */}
        <g transform={`translate(${ox} ${oy})`}>
          {links
            .filter((l) => l.path)
            .map((l) => {
              const color = client.color(depts.find((d) => d.id === l.from)!)
              return (
                <g key={`${l.from}-${l.to}`} className="link">
                  <path d={l.path} stroke={color} />
                  {!reducedMotion && (
                    <circle r={3} fill={color}>
                      <animateMotion dur="3.2s" repeatCount="indefinite" path={l.path} />
                    </circle>
                  )}
                </g>
              )
            })}
        </g>

        {/* Hub lines, rings and spokes */}
        {depts.map((d, i) => {
          const line = lines.find((l) => l.deptId === d.id)!
          const color = client.color(d)
          const rx = line.ring.x + ox
          const ry = line.ring.y + oy
          const n = d.agents.length
          const spread = Math.min(1.15, 0.26 * Math.max(n - 1, 1))
          const rand = rng(31 + i * 17)
          const active = !deptId || deptId === d.id
          return (
            <g key={d.id} className={`dept-art ${active ? '' : 'is-off'}`}>
              <g transform={`translate(${ox} ${oy})`}>
                <path className="line-glow" d={line.path} stroke={color} />
                <path className="line-glow line-glow-2" d={line.path} stroke={color} />
                <path className="line" d={line.path} stroke={color} />
                <path className="line-flow" d={line.path} />
                {!reducedMotion && (
                  <>
                    <circle r={8} fill={color} opacity={0.2}>
                      <animateMotion dur={`${4 + i * 0.6}s`} repeatCount="indefinite" path={line.path} />
                    </circle>
                    <circle r={2.6} fill="#fff">
                      <animateMotion dur={`${4 + i * 0.6}s`} repeatCount="indefinite" path={line.path} />
                    </circle>
                  </>
                )}
                <circle className="end-ring" cx={line.badge.x} cy={line.badge.y} r={11} stroke={color} />
                <text className="end-num" x={line.badge.x} y={line.badge.y}>
                  {two(i + 1)}
                </text>
              </g>
              {d.agents.map((a, k) => {
                const t = n === 1 ? 0 : k / (n - 1) - 0.5
                const ang = line.ring.angle + t * spread * 2
                const len = 50 + rand() * 30
                const ex = rx + Math.cos(ang) * len
                const ey = ry + Math.sin(ang) * len
                const mx = rx + Math.cos(ang) * len * 0.55
                const my = ry + Math.sin(ang) * len * 0.55
                return (
                  <g key={a.id} className="spoke">
                    <line x1={rx} y1={ry} x2={ex} y2={ey} />
                    <circle cx={mx} cy={my} r={1.6} fill={color} />
                    <circle cx={ex} cy={ey} r={3} />
                  </g>
                )
              })}
              <circle className="ring-halo" cx={rx} cy={ry} r={24} fill={color} />
              <circle className="ring" cx={rx} cy={ry} r={17} stroke={color} />
              <text className="ring-num" x={rx} y={ry} fill={color}>
                {two(i + 1)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Department names around the hub */}
      {depts.map((d) => {
        const line = lines.find((l) => l.deptId === d.id)!
        const up = Math.sin(line.ring.angle) < 0
        const leftSide = Math.cos(line.ring.angle) < 0
        // Wide screens: name above or below its ring. Tall screens: name beside its ring, on the outside.
        const x = line.ring.x + ox + (layout.portrait ? (leftSide ? -36 : 36) : leftSide ? 96 : -96)
        const y = layout.portrait ? line.ring.y + oy : line.ring.y + oy + (up ? -118 : 118)
        const anchor = leftSide ? 'translate(-100%, -50%)' : 'translate(0, -50%)'
        return (
          <span
            key={d.id}
            className={`hub-label ${!deptId || deptId === d.id ? '' : 'is-off'}`}
            style={{ left: x, top: y, color: client.color(d), transform: anchor }}
          >
            {d.name}
          </span>
        )
      })}

      {/* Labels for what flows between departments */}
      {depts.map((d) => {
        const labels = pillFor(d.id)
        if (!labels.length) return null
        const line = lines.find((l) => l.deptId === d.id)!
        return (
          <span key={d.id} className="flow-pill" style={{ left: line.labelAt.x + ox, top: line.labelAt.y + oy }}>
            {labels.join(' · ')}
          </span>
        )
      })}
      {links
        .filter((l) => l.path && l.labelAt)
        .map((l) => (
          <span
            key={`${l.from}-${l.to}`}
            className="flow-pill"
            style={{ left: l.labelAt!.x + ox, top: l.labelAt!.y + oy }}
          >
            {l.labels.join(' · ')}
          </span>
        ))}

      {/* Agent count, above the centre */}
      <div className="counter" aria-label={`${client.agentCount} AI agents`}>
        <span className="counter-num" aria-hidden>
          {count}
        </span>
        <span className="counter-cap">AI agents · {depts.length} departments</span>
      </div>

      {/* The agency, at the exact centre */}
      <div className="core">
        <span className="core-ring" aria-hidden />
        {agencyLogo ? (
          <span className="core-logo" role="img" aria-label="AI Advanced Gen" style={{ backgroundImage: `url(${agencyLogo})` }} />
        ) : (
          <span className="core-logo core-logo-text">AI Advanced Gen</span>
        )}
      </div>

      {/* The client it is built for, beneath the centre */}
      <div className="client">
        <span className="client-for">Built for</span>
        {client.logoUrl ? (
          <span className="client-shell">
            <span className="client-logo">
              <img src={client.logoUrl} alt={client.map.client.name} draggable={false} />
            </span>
          </span>
        ) : (
          <span className="tile tile-missing">{client.map.client.name} logo</span>
        )}
      </div>
    </div>
  )
}
