import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Bookmark, Heart, PawPrint, Trash2 } from 'lucide-react'
import { MenuRow } from '@/components/ui/menu-row'

const meta = {
  title: 'Design System/MenuRow',
  component: MenuRow,
  args: {
    label: '반려동물 관리',
    icon: <PawPrint className="h-4 w-4 text-sage-green" />,
  },
} satisfies Meta<typeof MenuRow>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const List: Story = {
  render: () => (
    <div className="w-80 overflow-hidden rounded-card border border-border bg-card-surface">
      <MenuRow icon={<PawPrint className="h-4 w-4 text-sage-green" />} label="반려동물 관리" />
      <MenuRow icon={<Heart className="h-4 w-4 text-soft-orange" />} label="장소 위시리스트" description="저장한 장소를 확인합니다" />
      <MenuRow icon={<Bookmark className="h-4 w-4 text-sage-green" />} label="게시글 북마크" />
      <MenuRow danger icon={<Trash2 className="h-4 w-4" />} label="회원 탈퇴" />
    </div>
  ),
}
