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
  home: {
    summary: '/home',
  },
  places: {
    nearby: '/places/nearby',
    detail: (placeId: string) => `/places/${pathId(placeId)}`,
  },
  users: {
    me: '/users/me',
    mypage: '/users/me/mypage',
    preferences: '/users/me/preferences',
    posts: '/users/me/posts',
    bookmarks: '/users/me/bookmarks',
    wishlist: '/users/me/wishlist',
    wishlistPlace: (placeId: string) => `/users/me/wishlist/${pathId(placeId)}`,
    reviews: '/users/me/reviews',
    nicknameAvailability: '/users/nickname/availability',
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
    posts: '/posts',
    post: (postId: string) => `/posts/${pathId(postId)}`,
    bookmark: (postId: string) => `/posts/${pathId(postId)}/bookmarks`,
  },
  albums: {
    list: '/albums',
    detail: (albumId: string) => `/albums/${pathId(albumId)}`,
  },
} as const
