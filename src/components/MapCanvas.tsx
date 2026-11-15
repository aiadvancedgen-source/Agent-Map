// The pan-and-zoom canvas. Level 1 fits the whole map; Level 2 moves the camera to one department.
import { useEffect, useMemo, useRef } from 'react'
import { Background, BackgroundVariant, ReactFlow, useReactFlow, type Node } from '@xyflow/react'
import { Maximize, Minus, Plus } from 'lucide-react'
import { useMap } from '../context'
import { DepartmentNode } from './DepartmentNode'
import { HubNode } from './HubNode'

const nodeTypes = { hub: HubNode, dept: DepartmentNode }

export function MapCanvas() {
  const { client, layout, deptId, go, reducedMotion } = useMap()
  const flow = useReactFlow()
  const first = useRef(true)

  const nodes = useMemo<Node[]>(
    () => [
      {
        id: '__hub',
        type: 'hub',
        position: { x: layout.hub.x, y: layout.hub.y },
        data: {},
        zIndex: 0,
        width: layout.hub.w,
        height: layout.hub.h,
        selectable: false,
        focusable: false,
        style: { pointerEvents: 'none' },
      },
      ...client.map.departments.map((d) => ({
        id: d.id,
        type: 'dept',
        position: { x: layout.panels[d.id].x, y: layout.panels[d.id].y },
        data: { deptId: d.id },
        zIndex: 1,
        width: layout.panels[d.id].w,
        height: layout.panels[d.id].h,
        focusable: false,
      })),
    ],
    [client, layout],
  )

  const fit = (animated: boolean) => {
    const duration = animated && !reducedMotion ? 750 : 0
    const narrow = window.innerWidth < 720
    if (deptId) {
      flow.fitView({
        nodes: [{ id: deptId }],
        padding: { top: '84px', bottom: narrow ? '96px' : '110px', left: '14px', right: '14px' },
        maxZoom: 1.3,
        duration,
      })
    } else {
      flow.fitView({
        padding: { top: narrow ? '176px' : '158px', bottom: narrow ? '104px' : '64px', left: '18px', right: '18px' },
        maxZoom: 1,
        duration,
      })
    }
  }

  // Move the camera whenever the level or the layout changes.
  useEffect(() => {
    const animated = !first.current
    first.current = false
    // Wait a frame so React Flow has the new node positions.
    const t = window.setTimeout(() => fit(animated), animated ? 30 : 80)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptId, layout])

  return (
    <div className="canvas">
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        nodesFocusable={false}
        minZoom={0.12}
        maxZoom={2}
        zoomOnDoubleClick={false}
        onNodeClick={(_, node) => {
          if (node.type === 'dept' && node.id !== deptId) go(node.id)
        }}
        onPaneClick={() => deptId && go()}
        proOptions={{ hideAttribution: false }}
      >
        <Background id="minor" variant={BackgroundVariant.Lines} gap={28} lineWidth={1} color="rgba(255,255,255,0.016)" />
        <Background id="major" variant={BackgroundVariant.Lines} gap={140} lineWidth={1} color="rgba(255,255,255,0.035)" />
      </ReactFlow>

      <div className="zoom island" role="group" aria-label="Zoom">
        <button type="button" onClick={() => flow.zoomIn({ duration: 200 })} aria-label="Zoom in">
          <Plus size={18} strokeWidth={1.5} aria-hidden />
        </button>
        <button type="button" onClick={() => flow.zoomOut({ duration: 200 })} aria-label="Zoom out">
          <Minus size={18} strokeWidth={1.5} aria-hidden />
        </button>
        <button type="button" onClick={() => fit(true)} aria-label="Fit to screen">
          <Maximize size={16} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    </div>
  )
}
