'use client'

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

const HANDLE_HEIGHT_PX = 32
const SNAP_THRESHOLD_PX = 40

interface SheetDragState {
  pointerId: number
  startY: number
  startOffset: number
  maxOffset: number
}

interface MapFlowDetailSheetProps {
  children: ReactNode
  className?: string
  collapseLabel: string
  contentClassName?: string
  expandLabel: string
  expanded: boolean
  id: string
  onExpandedChange: (expanded: boolean) => void
}

export default function MapFlowDetailSheet({
  children,
  className,
  collapseLabel,
  contentClassName,
  expandLabel,
  expanded,
  id,
  onExpandedChange,
}: MapFlowDetailSheetProps) {
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<SheetDragState | null>(null)
  const didDragRef = useRef(false)
  const contentId = `${id}-content`

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const sheetHeight = sheetRef.current?.getBoundingClientRect().height ?? 0
    const maxOffset = Math.max(0, sheetHeight - HANDLE_HEIGHT_PX)

    dragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startOffset: expanded ? 0 : maxOffset,
      maxOffset,
    }
    didDragRef.current = false
    setDragOffset(expanded ? 0 : maxOffset)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const deltaY = event.clientY - dragState.startY
    if (Math.abs(deltaY) > 4) didDragRef.current = true
    setDragOffset(
      Math.min(dragState.maxOffset, Math.max(0, dragState.startOffset + deltaY))
    )
  }

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const deltaY = event.clientY - dragState.startY
    const currentOffset = Math.min(
      dragState.maxOffset,
      Math.max(0, dragState.startOffset + deltaY)
    )
    const shouldExpand =
      deltaY <= -SNAP_THRESHOLD_PX ||
      (deltaY < SNAP_THRESHOLD_PX && currentOffset < dragState.maxOffset / 2)

    onExpandedChange(shouldExpand)
    setDragOffset(null)
    dragStateRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const cancelDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) return
    setDragOffset(null)
    dragStateRef.current = null
    didDragRef.current = false
  }

  const transform =
    dragOffset !== null
      ? `translate3d(0, ${dragOffset}px, 0)`
      : expanded
        ? 'translate3d(0, 0, 0)'
        : `translate3d(0, calc(100% - ${HANDLE_HEIGHT_PX}px), 0)`

  return (
    <div
      ref={sheetRef}
      id={id}
      style={{ transform }}
      className={cn(
        'map-flow-detail-sheet absolute inset-x-0 bottom-[156px] z-10 flex flex-col overflow-hidden rounded-t-[24px] bg-card-surface shadow-xl will-change-transform',
        dragOffset === null &&
          'transition-transform duration-300 ease-out motion-reduce:duration-0',
        className
      )}
    >
      <button
        type="button"
        className="flex h-8 w-full shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
        onClick={() => {
          if (didDragRef.current) {
            didDragRef.current = false
            return
          }
          onExpandedChange(!expanded)
        }}
        onPointerDown={startDrag}
        onPointerMove={move}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
        aria-controls={contentId}
        aria-expanded={expanded}
        aria-label={expanded ? collapseLabel : expandLabel}
      >
        <div className="h-1 w-10 rounded-full bg-border" />
      </button>

      <div
        id={contentId}
        className={cn(
          'isolate min-h-0 flex-1 rounded-t-[24px] bg-card-surface',
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
