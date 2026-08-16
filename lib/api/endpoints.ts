const pathId = (value: string) => encodeURIComponent(value)

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
  },
  preferences: {
    options: '/preferences/options',
  },
  breeds: {
    list: '/breeds',
  },
  activities: {
    list: '/activities',
  },
  users: {
    me: '/users/me',
  },
  pets: {
    list: '/pets',
    detail: (petId: string) => `/pets/${pathId(petId)}`,
  },
  routes: {
    recommend: '/routes/recommendations',
    detail: (routeId: string) => `/routes/${pathId(routeId)}`,
  },
  trips: {
    list: '/trips',
    detail: (tripId: string) => `/trips/${pathId(tripId)}`,
    notes: (tripId: string) => `/trips/${pathId(tripId)}/notes`,
  },
  community: {
    posts: '/community/posts',
    post: (postId: string) => `/community/posts/${pathId(postId)}`,
  },
  albums: {
    list: '/albums',
    detail: (albumId: string) => `/albums/${pathId(albumId)}`,
  },
} as const
