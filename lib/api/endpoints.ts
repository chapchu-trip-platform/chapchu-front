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
    recommended: '/recommended-places',
    detail: (externalPlaceId: string) => `/places/${pathId(externalPlaceId)}`,
  },
  courses: {
    create: '/courses',
    detail: (courseId: string) => `/courses/${pathId(courseId)}`,
    delete: (courseId: string) => `/courses/${pathId(courseId)}`,
    reviews: (courseId: string) => `/courses/${pathId(courseId)}/reviews`,
    complete: (courseId: string) => `/courses/${pathId(courseId)}/complete`,
    mine: '/users/me/courses',
  },
  users: {
    me: '/users/me',
    photo: '/users/me/photo',
    mypage: '/users/me/mypage',
    preferences: '/users/me/preferences',
    posts: '/users/me/posts',
    bookmarks: '/users/me/bookmarks',
    wishlist: '/users/me/wishlist',
    stamps: '/users/me/stamps',
    wishlistPlace: (placeId: string) => `/users/me/wishlist/${pathId(placeId)}`,
    reviews: '/users/me/reviews',
    nicknameAvailability: '/users/nickname/availability',
  },
  pets: {
    list: '/pets',
    detail: (petId: string) => `/pets/${pathId(petId)}`,
  },
  photos: {
    list: '/photos',
    uploadUrl: '/photos/upload-url',
    create: '/photos',
    detail: (photoId: string) => `/photos/${pathId(photoId)}`,
  },
  community: {
    posts: '/posts',
    post: (postId: string) => `/posts/${pathId(postId)}`,
    recommendations: (postId: string) => `/posts/${pathId(postId)}/recommendations`,
    bookmark: (postId: string) => `/posts/${pathId(postId)}/bookmarks`,
    reports: (postId: string) => `/posts/${pathId(postId)}/reports`,
    comments: (postId: string) => `/posts/${pathId(postId)}/comments`,
    comment: (commentId: string) => `/comments/${pathId(commentId)}`,
  },
  reviews: {
    create: '/reviews',
    list: '/reviews',
    byPlace: (placeId: string) => `/places/${pathId(placeId)}/reviews`,
    detail: (reviewId: string) => `/reviews/${pathId(reviewId)}`,
    recommendations: (reviewId: string) => `/reviews/${pathId(reviewId)}/recommendations`,
  },
  albums: {
    mine: '/users/me/album',
    byPet: (petId: string) => `/users/me/pets/${pathId(petId)}/album`,
  },
} as const
