import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Input, Textarea } from '@/components/ui/input'

const meta = {
  title: 'Design System/FormControls',
  component: Input,
  args: {
    placeholder: '내용을 입력하세요',
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const InputPlayground: Story = {}

export const InputStates: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <Input placeholder="기본 입력" />
      <Input size="compact" placeholder="컴팩트 입력" />
      <Input defaultValue="입력된 내용" />
      <Input aria-invalid defaultValue="올바르지 않은 내용" />
      <Input disabled placeholder="비활성 입력" />
    </div>
  ),
}

export const TextareaStates: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <Textarea rows={4} placeholder="여행의 경험을 입력하세요" />
      <Textarea rows={4} disabled placeholder="비활성 입력" />
    </div>
  ),
}
