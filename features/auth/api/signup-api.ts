'use client'

import { publicApiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  BreedOption,
  IntegratedSignupRequest,
  IntegratedSignupResponse,
  NamedOption,
  SignupOptions,
} from '@/features/auth/types/signup'

interface PreferenceOptionsResponse {
  regions: NamedOption[]
  themes: NamedOption[]
  transportMethods: NamedOption[]
}

export async function fetchSignupOptions(): Promise<SignupOptions> {
  const [preferencesResponse, breedsResponse, activitiesResponse] =
    await Promise.all([
      publicApiClient.get<PreferenceOptionsResponse>(
        API_ENDPOINTS.preferences.options
      ),
      publicApiClient.get<BreedOption[]>(API_ENDPOINTS.breeds.list),
      publicApiClient.get<NamedOption[]>(API_ENDPOINTS.activities.list),
    ])

  return {
    ...preferencesResponse.data,
    breeds: breedsResponse.data,
    activities: activitiesResponse.data,
  }
}

export async function submitIntegratedSignup(
  request: IntegratedSignupRequest
): Promise<IntegratedSignupResponse> {
  const { data } = await publicApiClient.post<IntegratedSignupResponse>(
    API_ENDPOINTS.auth.signup,
    request
  )
  return data
}

interface SignupApiError {
  type?: string
  status?: number
}

export function getSignupErrorMessage(error: unknown) {
  const apiError = error as SignupApiError

  if (apiError.status === 401) {
    return '회원가입 시간이 만료되었습니다. Google 로그인부터 다시 시작해주세요.'
  }
  if (apiError.status === 409) {
    return '이미 가입된 계정이거나 사용 중인 닉네임입니다.'
  }
  if (apiError.status === 404) {
    return '선택지가 변경되어 새로 불러왔습니다. 선택 내용을 확인하고 다시 시도해주세요.'
  }
  if (apiError.type === 'network') {
    return '네트워크 연결을 확인한 뒤 다시 시도해주세요.'
  }
  if (apiError.type === 'timeout' || apiError.status === 502) {
    return '서버 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.'
  }
  return '회원가입을 완료하지 못했습니다. 입력 내용을 확인하고 다시 시도해주세요.'
}

export function getSignupOptionsErrorMessage(error: unknown) {
  const apiError = error as SignupApiError
  if (apiError.type === 'network') {
    return '선택지를 불러오지 못했습니다. 네트워크 연결을 확인해주세요.'
  }
  return '회원가입 선택지를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
}
