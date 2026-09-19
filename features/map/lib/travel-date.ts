export function formatLocalTravelDate(date: Date) {
  if (Number.isNaN(date.getTime())) throw new Error('Travel date is invalid.')
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
