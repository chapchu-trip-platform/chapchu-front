import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ChoiceChip } from '@/components/ui/choice-chip'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input, Textarea } from '@/components/ui/input'
import { InteractiveCard } from '@/components/ui/interactive-card'
import { MenuRow } from '@/components/ui/menu-row'
import { ModalActions } from '@/components/ui/modal-actions'

afterEach(cleanup)

describe('shared UI primitives', () => {
  it('keeps icon-only actions accessible and non-submitting by default', () => {
    render(<IconButton aria-label="닫기">×</IconButton>)

    const button = screen.getByRole('button', { name: '닫기' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveClass('rounded-full')
  })

  it('exposes the selected state of choice chips', () => {
    render(<ChoiceChip selected>소형견</ChoiceChip>)

    expect(screen.getByRole('button', { name: '소형견' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('applies one input system to single-line and multiline fields', () => {
    render(
      <>
        <Input aria-label="이름" />
        <Textarea aria-label="소개" />
      </>
    )

    expect(screen.getByRole('textbox', { name: '이름' })).toHaveClass('border-border')
    expect(screen.getByRole('textbox', { name: '소개' })).toHaveClass('border-border')
  })

  it('provides consistent interaction containers', () => {
    render(
      <>
        <ModalActions data-testid="actions">actions</ModalActions>
        <InteractiveCard>산책 코스</InteractiveCard>
        <MenuRow label="설정" description="알림 및 계정 설정" />
      </>
    )

    expect(screen.getByTestId('actions')).toHaveClass('flex', 'gap-2')
    expect(screen.getByRole('button', { name: '산책 코스' })).toHaveClass(
      'rounded-card'
    )
    expect(screen.getByRole('button', { name: /설정/ })).toHaveClass('w-full')
  })

  it('darkens clickable surfaces on hover and press', () => {
    render(
      <>
        <Button>저장</Button>
        <InteractiveCard>산책 코스</InteractiveCard>
        <MenuRow label="설정" />
      </>
    )

    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveClass('hover:brightness-[0.97]', 'active:brightness-[0.94]')
    }
  })
})
