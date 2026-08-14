'use client'

export function navigateBrowser(url: string) {
  window.location.assign(url)
}

export function redirectToLogin() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.replace('/login')
  }
}
