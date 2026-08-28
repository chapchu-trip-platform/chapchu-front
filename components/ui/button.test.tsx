import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Button } from '@/components/ui/button'

afterEach(cleanup)

describe('Button', () => {
  it('applies the PawRoute primary CTA design', () => {
    render(
      <Button fullWidth size="lg">
        여행 시작하기
      </Button>
    )

    expect(screen.getByRole('button', { name: '여행 시작하기' })).toHaveClass(
      'h-12',
      'w-full',
      'rounded-btn',
      'bg-sage-green',
      'text-white'
    )
  })

  it('provides consistent outline and destructive variants', () => {
    render(
      <>
        <Button variant="outline">취소</Button>
        <Button variant="destructive">삭제</Button>
      </>
    )

    expect(screen.getByRole('button', { name: '취소' })).toHaveClass(
      'border-border',
      'bg-card-surface'
    )
    expect(screen.getByRole('button', { name: '삭제' })).toHaveClass('bg-danger', 'text-white')
  })
})
