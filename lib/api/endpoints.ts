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
    wishlist: '/users/me/wishlist',
    wishlistPlace: (placeId: string) => `/users/me/wishlist/${pathId(placeId)}`,
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
    myPosts: '/users/me/posts',
    myBookmarks: '/users/me/bookmarks',
    recommendations: (postId: string) => `/posts/${pathId(postId)}/recommendations`,
    bookmarks: (postId: string) => `/posts/${pathId(postId)}/bookmarks`,
    reports: (postId: string) => `/posts/${pathId(postId)}/reports`,
    comments: (postId: string) => `/posts/${pathId(postId)}/comments`,
    comment: (commentId: string) => `/comments/${pathId(commentId)}`,
  },
  reviews: {
    list: '/reviews',
    mine: '/users/me/reviews',
    byPlace: (placeId: string) => `/places/${pathId(placeId)}/reviews`,
    detail: (reviewId: string) => `/reviews/${pathId(reviewId)}`,
    recommendations: (reviewId: string) => `/reviews/${pathId(reviewId)}/recommendations`,
  },
  albums: {
    list: '/albums',
    detail: (albumId: string) => `/albums/${pathId(albumId)}`,
  },
} as const
