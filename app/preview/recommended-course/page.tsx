import { notFound } from 'next/navigation'
import RecommendedCoursePreview from './recommended-course-preview'

export default function RecommendedCoursePreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  return <RecommendedCoursePreview />
}
