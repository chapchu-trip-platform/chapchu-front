'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  announceDiagnosticViewer,
  releaseDiagnosticViewer,
  requestAuthStateSnapshot,
  supportsCrossTabDiagnostics,
  subscribeToDiagnosticEvents,
  type DiagnosticEvent,
  type DiagnosticKind,
} from '@/features/devtools/lib/dev-diagnostics'

type Filter = 'all' | DiagnosticKind

const MAX_EVENTS = 200

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
  }).format(new Date(timestamp))
}

const kindStyles: Record<DiagnosticKind, string> = {
  network: 'border-sky-200 bg-sky-50 text-sky-800',
  state: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  system: 'border-amber-200 bg-amber-50 text-amber-800',
}

export default function DevDiagnosticsScreen() {
  const [events, setEvents] = useState<DiagnosticEvent[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [paused, setPaused] = useState(false)
  const [crossTabSupported, setCrossTabSupported] = useState(false)
  const pausedRef = useRef(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const capabilityId = window.setTimeout(
      () => setCrossTabSupported(supportsCrossTabDiagnostics()),
      0
    )
    announceDiagnosticViewer()
    const presenceId = window.setInterval(announceDiagnosticViewer, 1_000)
    const unsubscribe = subscribeToDiagnosticEvents((event) => {
      if (pausedRef.current) return
      setEvents((current) =>
        current.some((existingEvent) => existingEvent.id === event.id)
          ? current
          : [...current.slice(-(MAX_EVENTS - 1)), event]
      )
    })
    const requestId = window.setTimeout(requestAuthStateSnapshot, 50)
    return () => {
      window.clearTimeout(requestId)
      window.clearTimeout(capabilityId)
      window.clearInterval(presenceId)
      releaseDiagnosticViewer()
      unsubscribe()
    }
  }, [])

  const filteredEvents = useMemo(
    () =>
      filter === 'all'
        ? events
        : events.filter((event) => event.kind === filter),
    [events, filter]
  )

  useEffect(() => {
    listEndRef.current?.scrollIntoView?.({ block: 'end' })
  }, [filteredEvents])

  return (
    <main className="min-h-dvh bg-[#171512] px-4 py-5 text-[#f7f1e7] sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="rounded-2xl border border-white/10 bg-[#211e1a] p-4 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fc5a5]">
                Development only
              </p>
              <h1 className="mt-1 text-xl font-bold">Chapchu Live Console</h1>
              <p className="mt-1 text-sm text-white/60">
                다른 앱 탭에서 발생하는 상태 변경과 Axios 요청·응답을 실시간으로 표시합니다.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                {crossTabSupported ? '탭 간 연결됨' : '현재 탭 연결됨'}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1.5 text-white/60">
                {events.length}/{MAX_EVENTS}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(['all', 'network', 'state', 'system'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === value
                    ? 'border-[#8fc5a5] bg-[#8fc5a5]/15 text-[#bce5cc]'
                    : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                }`}
              >
                {value === 'all' ? '전체' : value.toUpperCase()}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => setPaused((current) => !current)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
              >
                {paused ? '수집 재개' : '수집 일시정지'}
              </button>
              <button
                type="button"
                onClick={() => setEvents([])}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
              >
                로그 지우기
              </button>
            </div>
          </div>
        </header>

        <section
          aria-label="개발 로그"
          className="h-[calc(100dvh-12.5rem)] min-h-[420px] overflow-y-auto rounded-2xl border border-white/10 bg-[#11100e] p-3 font-mono text-xs shadow-xl"
        >
          {filteredEvents.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-white/40">
              <p>
                아직 수집된 로그가 없습니다.
                <br />
                다른 탭에서 로그인이나 회원가입 동작을 진행해주세요.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredEvents.map((event) => (
                <details
                  key={event.id}
                  open={event.kind === 'network'}
                  className="group rounded-xl border border-white/10 bg-white/[0.035]"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5">
                    <span className="w-[88px] flex-none text-white/35">
                      {formatTime(event.timestamp)}
                    </span>
                    <span
                      className={`w-[72px] flex-none rounded-md border px-2 py-0.5 text-center text-[10px] font-bold ${kindStyles[event.kind]}`}
                    >
                      {event.kind.toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 break-all text-white/85">
                      {event.summary}
                    </span>
                    <span className="text-white/25 transition-transform group-open:rotate-90">
                      ▶
                    </span>
                  </summary>
                  <div className="border-t border-white/10 px-3 py-3">
                    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-white/35">
                      <span>source: {event.source}</span>
                      {event.requestId ? <span>request: {event.requestId}</span> : null}
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-black/35 p-3 leading-relaxed text-[#d9e6dc]">
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  </div>
                </details>
              ))}
              <div ref={listEndRef} />
            </div>
          )}
        </section>

        <p className="text-center text-[11px] text-white/35">
          access token, registration token, Authorization, Cookie 값은 자동으로 마스킹됩니다.
        </p>
      </div>
    </main>
  )
}
