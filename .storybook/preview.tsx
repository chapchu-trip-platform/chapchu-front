import type { Preview } from '@storybook/nextjs-vite'
import '../app/globals.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'warm-beige',
      values: [
        { name: 'warm-beige', value: '#F7F1E7' },
        { name: 'card', value: '#FDFAF4' },
        { name: 'white', value: '#FFFFFF' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
  },
}

export default preview
