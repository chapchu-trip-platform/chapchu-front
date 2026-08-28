'use client'

import { useEffect, useId } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RequiredFieldsModalProps {
  fields: string[]
  onConfirm: () => void
}

export function RequiredFieldsModal({
  fields,
  onConfirm,
}: RequiredFieldsModalProps) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onConfirm()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onConfirm])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-[398px] rounded-card border border-border bg-card-surface p-5 shadow-xl"
      >
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-soft-orange/15">
          <AlertCircle aria-hidden="true" className="h-5 w-5 text-soft-orange" />
        </div>
        <h2
          id={titleId}
          className="text-center text-[17px] font-bold text-deep-brown"
        >
          필수 정보를 입력해주세요
        </h2>
        <p
          id={descriptionId}
          className="mt-2 text-center text-[13px] leading-relaxed text-warm-gray"
        >
          아래 항목을 입력하거나 선택한 후 다시 진행해주세요.
        </p>
        <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto rounded-[12px] bg-warm-beige px-4 py-3 text-[13px] text-deep-brown">
          {fields.map((field, index) => (
            <li key={`${field}-${index}`} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-soft-orange" />
              <span>{field}</span>
            </li>
          ))}
        </ul>
        <Button autoFocus onClick={onConfirm} fullWidth className="mt-5">
          확인
        </Button>
      </div>
    </div>
  )
}
