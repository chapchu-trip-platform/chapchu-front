export const STAMP_REGIONS = [
  { name: '서울', slug: 'seoul' },
  { name: '부산', slug: 'busan' },
  { name: '대구', slug: 'daegu' },
  { name: '인천', slug: 'incheon' },
  { name: '광주', slug: 'gwangju' },
  { name: '대전', slug: 'daejeon' },
  { name: '울산', slug: 'ulsan' },
  { name: '세종', slug: 'sejong' },
  { name: '경기', slug: 'gyeonggi' },
  { name: '강원', slug: 'gangwon' },
  { name: '충북', slug: 'chungbuk' },
  { name: '충남', slug: 'chungnam' },
  { name: '전북', slug: 'jeonbuk' },
  { name: '전남', slug: 'jeonnam' },
  { name: '경북', slug: 'gyeongbuk' },
  { name: '경남', slug: 'gyeongnam' },
  { name: '제주', slug: 'jeju' },
] as const

export type StampRegionName = (typeof STAMP_REGIONS)[number]['name']
export type StampRegionSlug = (typeof STAMP_REGIONS)[number]['slug']

const regionByName = new Map<string, (typeof STAMP_REGIONS)[number]>(
  STAMP_REGIONS.map((region) => [region.name, region])
)

const regionOrder = new Map<string, number>(
  STAMP_REGIONS.map((region, index) => [region.name, index])
)

export function getStampRegion(name: string) {
  return regionByName.get(name)
}

export function getStampRegionOrder(name: string) {
  return regionOrder.get(name) ?? STAMP_REGIONS.length
}
