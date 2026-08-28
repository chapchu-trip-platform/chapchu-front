import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ChoiceChip } from '@/components/ui/choice-chip'

const meta = {
  title: 'Design System/ChoiceChip',
  component: ChoiceChip,
  args: {
    children: '자연',
    selected: false,
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['sage', 'orange'],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'segment'],
    },
    shape: {
      control: 'select',
      options: ['pill', 'card'],
    },
  },
} satisfies Meta<typeof ChoiceChip>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

function InteractiveChips() {
  const [selected, setSelected] = useState(['자연'])
  const options = ['자연', '도심', '해변', '산악']

  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <ChoiceChip
          key={option}
          selected={selected.includes(option)}
          onClick={() => setSelected((current) =>
            current.includes(option)
              ? current.filter((item) => item !== option)
              : [...current, option]
          )}
        >
          {option}
        </ChoiceChip>
      ))}
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveChips />,
}

export const Tones: Story = {
  render: () => (
    <div className="flex gap-2">
      <ChoiceChip selected>자연</ChoiceChip>
      <ChoiceChip selected tone="orange">자차</ChoiceChip>
      <ChoiceChip>도심</ChoiceChip>
    </div>
  ),
}
