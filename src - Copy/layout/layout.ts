// Automatic layout. ELK places the hub in the middle layer and the departments
// in the layers either side of it: left and right on a wide screen, above and
// below on a tall one. Any number of departments works.
import ELK from 'elkjs/lib/elk.bundled.js'
import type { ClientMap, Department } from '../types'

const elk = new ELK()

export const PANEL_W = 420
export const HUB_SIZE = 590
const HEADER_H = 70
const ROW_H = 98
const FOOTER_H = 56

export const panelHeight = (dept: Department) => HEADER_H + dept.agents.length * ROW_H + FOOTER_H

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface DeptLine {
  deptId: string
  /** Point on the hub ring where the line starts. */
  ring: { x: number; y: number; angle: number }
  /** Point on the department panel where the line ends. */
  end: { x: number; y: number }
  /** Centre of the small numbered ring, just outside the panel edge. */
  badge: { x: number; y: number }
  /** SVG path, right-angled with rounded corners. */
  path: string
  /** Midpoint of the longest straight run, for a label pill. */
  labelAt: { x: number; y: number }
}

export interface FlowLink {
  from: string
  to: string
  labels: string[]
  /** Direct connector between two neighbouring panels, if they are neighbours. */
  path?: string
  labelAt?: { x: number; y: number }
}

export interface MapLayout {
  portrait: boolean
  hub: Box
  panels: Record<string, Box>
  lines: DeptLine[]
  links: FlowLink[]
  bounds: Box
}

export const RING_R = 212

const round = (pts: [number, number][], r = 14) => {
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1]
    const [cx, cy] = pts[i]
    const [nx, ny] = pts[i + 1]
    const inLen = Math.hypot(cx - px, cy - py)
    const outLen = Math.hypot(nx - cx, ny - cy)
    const rr = Math.min(r, inLen / 2, outLen / 2)
    if (rr < 1) {
      d += ` L ${cx} ${cy}`
      continue
    }
    const ax = cx - ((cx - px) / inLen) * rr
    const ay = cy - ((cy - py) / inLen) * rr
    const bx = cx + ((nx - cx) / outLen) * rr
    const by = cy + ((ny - cy) / outLen) * rr
    d += ` L ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`
  }
  const last = pts[pts.length - 1]
  return d + ` L ${last[0]} ${last[1]}`
}

const longestRunMid = (pts: [number, number][]) => {
  let best = { x: pts[0][0], y: pts[0][1] }
  let bestLen = -1
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    if (len > bestLen) {
      bestLen = len
      best = { x: (pts[i][0] + pts[i - 1][0]) / 2, y: (pts[i][1] + pts[i - 1][1]) / 2 }
    }
  }
  return best
}

export async function layoutMap(map: ClientMap, portrait: boolean): Promise<MapLayout> {
  const depts = map.departments
  // Alternate departments between the two sides so both stay balanced.
  const before = depts.filter((_, i) => i % 2 === 0)
  const after = depts.filter((_, i) => i % 2 === 1)

  const graph = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': portrait ? 'DOWN' : 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': portrait ? '96' : '140',
      'elk.spacing.nodeNode': portrait ? '44' : '64',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
    },
    children: [
      ...before.map((d) => ({ id: d.id, width: PANEL_W, height: panelHeight(d) })),
      { id: '__hub', width: HUB_SIZE, height: HUB_SIZE },
      ...after.map((d) => ({ id: d.id, width: PANEL_W, height: panelHeight(d) })),
    ],
    edges: [
      ...before.map((d) => ({ id: `e-${d.id}`, sources: [d.id], targets: ['__hub'] })),
      ...after.map((d) => ({ id: `e-${d.id}`, sources: ['__hub'], targets: [d.id] })),
    ],
  })

  const box = (id: string): Box => {
    const n = graph.children!.find((c) => c.id === id)!
    return { x: n.x ?? 0, y: n.y ?? 0, w: n.width ?? 0, h: n.height ?? 0 }
  }
  const hub = box('__hub')
  const panels: Record<string, Box> = {}
  for (const d of depts) panels[d.id] = box(d.id)

  const hx = hub.x + hub.w / 2
  const hy = hub.y + hub.h / 2

  const lines: DeptLine[] = depts.map((d) => {
    const p = panels[d.id]
    const pcx = p.x + p.w / 2
    const pcy = p.y + p.h / 2
    const angle = Math.atan2(pcy - hy, pcx - hx)
    const ring = { x: hx + Math.cos(angle) * RING_R, y: hy + Math.sin(angle) * RING_R, angle }
    let pts: [number, number][]
    let end: { x: number; y: number }
    let badge: { x: number; y: number }
    if (portrait) {
      const above = pcy < hy
      end = { x: pcx, y: above ? p.y + p.h : p.y }
      badge = { x: end.x, y: end.y + (above ? 20 : -20) }
      const hubEdge = above ? hub.y : hub.y + hub.h
      const midY = (hubEdge + end.y) / 2
      pts = [
        [ring.x, ring.y],
        [ring.x, midY],
        [end.x, midY],
        [end.x, end.y],
      ]
    } else {
      const left = pcx < hx
      end = { x: left ? p.x + p.w : p.x, y: pcy }
      badge = { x: end.x + (left ? 20 : -20), y: end.y }
      const hubEdge = left ? hub.x : hub.x + hub.w
      const midX = (hubEdge + end.x) / 2
      pts = [
        [ring.x, ring.y],
        [midX, ring.y],
        [midX, end.y],
        [end.x, end.y],
      ]
    }
    return { deptId: d.id, ring, end, badge, path: round(pts), labelAt: longestRunMid(pts.slice(1)) }
  })

  // Flows between departments. Neighbouring panels get a direct connector;
  // the rest are shown as a label on the receiving department's hub line.
  const deptOf = new Map<string, string>()
  for (const d of depts) for (const a of d.agents) deptOf.set(a.id, d.id)
  const pairs = new Map<string, FlowLink>()
  for (const f of map.flows ?? []) {
    const from = deptOf.get(f.from)
    const to = deptOf.get(f.to)
    if (!from || !to || from === to) continue
    const key = `${from}>${to}`
    const link = pairs.get(key) ?? { from, to, labels: [] }
    if (!link.labels.includes(f.label)) link.labels.push(f.label)
    pairs.set(key, link)
  }
  const links = [...pairs.values()].map((link) => {
    const a = panels[link.from]
    const b = panels[link.to]
    const sameSide = before.some((d) => d.id === link.from) === before.some((d) => d.id === link.to)
    if (!sameSide) return link
    if (portrait) {
      // Side by side in the same row.
      const [l, r] = a.x < b.x ? [a, b] : [b, a]
      const gap = r.x - (l.x + l.w)
      if (gap < 0 || gap > 120) return link
      // Run the connector along the outer edge of the row, away from the hub.
      const below = l.y > hy
      const edge = (p: Box) => (below ? p.y + p.h : p.y)
      const y = (below ? Math.max(edge(l), edge(r)) : Math.min(edge(l), edge(r))) + (below ? 34 : -34)
      const ax = a.x + a.w / 2
      const bx = b.x + b.w / 2
      const pts: [number, number][] = [[ax, edge(a)], [ax, y], [bx, y], [bx, edge(b)]]
      return { ...link, path: round(pts), labelAt: { x: (ax + bx) / 2, y } }
    }
    // Stacked in the same column.
    const [t, btm] = a.y < b.y ? [a, b] : [b, a]
    const gap = btm.y - (t.y + t.h)
    if (gap < 0 || gap > 140) return link
    const x = t.x + t.w / 2
    const pts: [number, number][] = a.y < b.y ? [[x, t.y + t.h], [x, btm.y]] : [[x, btm.y], [x, t.y + t.h]]
    return { ...link, path: round(pts), labelAt: { x, y: (t.y + t.h + btm.y) / 2 } }
  })

  const all = [hub, ...Object.values(panels)]
  const minX = Math.min(...all.map((b) => b.x))
  const minY = Math.min(...all.map((b) => b.y))
  const maxX = Math.max(...all.map((b) => b.x + b.w))
  const maxY = Math.max(...all.map((b) => b.y + b.h))

  return {
    portrait,
    hub,
    panels,
    lines,
    links,
    bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
  }
}
