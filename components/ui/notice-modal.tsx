'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'

interface NoticeModalProps {
  message: string | null
  onClose: () => void
  returnFocus?: HTMLElement | null
  fallbackFocus?: RefObject<HTMLElement | null>
}

/** Acknowledged feedback: closes with its button, Escape or the dimmed backdrop. */
export function NoticeModal({ message, onClose, returnFocus, fallbackFocus }: NoticeModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  useEffect(() => { if (message !== null) returnFocusRef.current = returnFocus ?? null }, [message, returnFocus])
  return <Dialog.Root open={message !== null} onOpenChange={open => { if (!open) onClose() }}>
    <Dialog.Portal>
      <Dialog.Backdrop data-testid="notice-modal-backdrop" className="fixed inset-0 z-[80] bg-black/45" />
      <Dialog.Popup
        initialFocus={closeRef}
        finalFocus={() => {
          const target = returnFocusRef.current
          return target?.isConnected && !target.matches(':disabled') ? target : fallbackFocus?.current ?? true
        }}
        className="fixed left-1/2 top-1/2 z-[81] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[398px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card border border-border bg-card-surface p-5 text-deep-brown shadow-xl outline-none"
      >
        <Dialog.Title className="sr-only">안내</Dialog.Title>
        <Dialog.Description aria-live="polite" aria-atomic="true" className="whitespace-pre-wrap break-words text-center text-[14px] leading-relaxed">{message}</Dialog.Description>
        <Dialog.Close render={<Button ref={closeRef} type="button" fullWidth className="mt-5" />}>닫기</Dialog.Close>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
}
