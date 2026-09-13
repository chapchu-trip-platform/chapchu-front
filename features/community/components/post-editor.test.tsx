import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { usePostDraftStore } from '@/features/community/stores/post-draft-store'
import { createPost, fetchMyPosts, fetchPost, updatePost } from '@/features/community/api/community-api'
import { uploadPhotoFiles } from '@/features/photos/api/photo-api'
import { postFixture } from '@/test/fixtures/community'
import { mockRouter } from '@/test/mocks/next-navigation'
import PostEditor from './post-editor'

vi.mock('@/features/community/api/community-api')
vi.mock('@/features/photos/api/photo-api')

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ status: 'authenticated', sessionEpoch: 0 })
  usePostDraftStore.getState().clear()
  vi.mocked(createPost).mockResolvedValue(undefined)
  vi.mocked(fetchPost).mockResolvedValue(postFixture)
  vi.mocked(fetchMyPosts).mockResolvedValue([postFixture])
  vi.mocked(updatePost).mockResolvedValue(postFixture)
  vi.mocked(uploadPhotoFiles).mockResolvedValue([])
})
afterEach(cleanup)

describe('free-board post editor', () => {
  it('loads an existing post into the writing layout without overwriting a new-post draft', async () => {
    usePostDraftStore.getState().update({ title: '새 글 초안', content: '별도로 보존할 내용' })
    const existingPost = {
      ...postFixture,
      photoId: 'photo-1',
      photoUrl: 'https://example.com/photo-1.jpg',
      photos: [
        { photoId: 'photo-1', photoKey: 'post/user/one.jpg', downloadUrl: 'https://example.com/photo-1.jpg' },
        { photoId: 'photo-2', photoKey: 'post/user/two.jpg', downloadUrl: 'https://example.com/photo-2.jpg' },
      ],
    }
    vi.mocked(fetchPost).mockResolvedValue(existingPost)

    render(<PostEditor editPostId="post-1" />)

    expect(await screen.findByLabelText('제목')).toHaveValue(postFixture.title)
    expect(screen.getByLabelText('내용')).toHaveValue(postFixture.content)
    expect(fetchPost).toHaveBeenCalledWith('post-1', expect.any(AbortSignal))
    expect(fetchMyPosts).toHaveBeenCalledWith(expect.any(AbortSignal))
    expect(screen.getByLabelText('게시글 사진 편집')).toHaveTextContent('2 / 10장')
    expect(screen.getByLabelText('게시글 사진 선택')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /삭제/ })).toHaveLength(2)
    expect(screen.getByRole('button', { name: '수정 저장' })).toBeDisabled()
    expect(usePostDraftStore.getState()).toMatchObject({
      title: '새 글 초안',
      content: '별도로 보존할 내용',
    })
  })

  it('does not render the edit form when a direct edit URL targets another user post', async () => {
    vi.mocked(fetchMyPosts).mockResolvedValue([])

    render(<PostEditor editPostId="post-1" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('본인이 작성한 게시글만 수정할 수 있어요.')
    expect(screen.queryByLabelText('제목')).not.toBeInTheDocument()
    expect(updatePost).not.toHaveBeenCalled()
  })

  it('returns through browser history when editing started from the detail screen', async () => {
    const user = userEvent.setup()
    render(<PostEditor editPostId="post-1" returnToPrevious />)

    await user.click(await screen.findByRole('button', { name: '수정 취소' }))

    expect(mockRouter.back).toHaveBeenCalledOnce()
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it('keeps edited text after a failed update and retries without sending photo data', async () => {
    vi.mocked(updatePost)
      .mockRejectedValueOnce({ type: 'network' })
      .mockResolvedValueOnce({ ...postFixture, title: '수정한 제목' })
    const user = userEvent.setup()
    render(<PostEditor editPostId="post-1" />)
    const titleInput = await screen.findByLabelText('제목')
    await user.clear(titleInput)
    await user.type(titleInput, '수정한 제목')

    await user.click(screen.getByRole('button', { name: '수정 저장' }))

    expect(await screen.findByRole('dialog')).toHaveTextContent('인터넷 연결')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.getByLabelText('제목')).toHaveValue('수정한 제목')
    await user.click(screen.getByRole('button', { name: '수정 저장' }))

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/community?post=post-1&tab=free'))
    expect(updatePost).toHaveBeenLastCalledWith(
      'post-1',
      { title: '수정한 제목', content: postFixture.content },
      expect.any(AbortSignal),
    )
    expect(Object.keys(vi.mocked(updatePost).mock.calls[1][1])).toEqual(['title', 'content'])
    expect(uploadPhotoFiles).not.toHaveBeenCalled()
  })

  it('verifies an uncertain update before asking the user to retry', async () => {
    const updatedPost = { ...postFixture, title: '서버에 반영된 제목' }
    vi.mocked(fetchPost).mockResolvedValueOnce(postFixture).mockResolvedValueOnce(updatedPost)
    vi.mocked(updatePost).mockRejectedValueOnce({ type: 'timeout' })
    const user = userEvent.setup()
    render(<PostEditor editPostId="post-1" />)
    const titleInput = await screen.findByLabelText('제목')
    await user.clear(titleInput)
    await user.type(titleInput, updatedPost.title)

    await user.click(screen.getByRole('button', { name: '수정 저장' }))

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/community?post=post-1&tab=free'))
    expect(updatePost).toHaveBeenCalledOnce()
    expect(fetchPost).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('uploads only new photos and sends the complete edited order', async () => {
    const existingPost = {
      ...postFixture,
      photoId: 'photo-1',
      photoUrl: 'https://example.com/photo-1.jpg',
      photos: [
        { photoId: 'photo-1', photoKey: 'post/user/one.jpg', downloadUrl: 'https://example.com/photo-1.jpg' },
        { photoId: 'photo-2', photoKey: 'post/user/two.jpg', downloadUrl: 'https://example.com/photo-2.jpg' },
      ],
    }
    vi.mocked(fetchPost).mockResolvedValue(existingPost)
    vi.mocked(fetchMyPosts).mockResolvedValue([existingPost])
    vi.mocked(uploadPhotoFiles).mockResolvedValue([
      { uploadUrl: 'https://upload.example/new', photoKey: 'post/user/new.jpg', fileName: 'new.jpg' },
    ])
    const user = userEvent.setup()
    const createObjectUrl = vi.fn(() => 'blob:new-preview')
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    render(<PostEditor editPostId="post-1" />)

    await user.click((await screen.findAllByRole('button', { name: /삭제/ }))[0])
    const file = new File(['new'], 'new.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('게시글 사진 선택'), file)
    await user.click(screen.getByRole('button', { name: 'new.jpg 왼쪽으로 이동' }))
    await user.click(screen.getByRole('button', { name: '수정 저장' }))

    await waitFor(() => expect(updatePost).toHaveBeenCalledWith('post-1', {
      title: postFixture.title,
      content: postFixture.content,
      photos: [{ photoKey: 'post/user/new.jpg' }, { photoKey: 'post/user/two.jpg' }],
    }, expect.any(AbortSignal)))
    expect(uploadPhotoFiles).toHaveBeenCalledWith([file], 'POST', expect.any(AbortSignal), expect.any(Function))
  })

  it('sends an empty photo array when every existing photo is removed', async () => {
    const existingPost = {
      ...postFixture,
      photoId: 'photo-1',
      photoUrl: 'https://example.com/photo-1.jpg',
      photos: [
        { photoId: 'photo-1', photoKey: 'post/user/one.jpg', downloadUrl: 'https://example.com/photo-1.jpg' },
        { photoId: 'photo-2', photoKey: 'post/user/two.jpg', downloadUrl: 'https://example.com/photo-2.jpg' },
      ],
    }
    vi.mocked(fetchPost).mockResolvedValue(existingPost)
    vi.mocked(fetchMyPosts).mockResolvedValue([existingPost])
    const user = userEvent.setup()
    render(<PostEditor editPostId="post-1" />)

    await user.click((await screen.findAllByRole('button', { name: /삭제/ }))[0])
    await user.click(screen.getByRole('button', { name: /삭제/ }))
    await user.click(screen.getByRole('button', { name: '수정 저장' }))

    await waitFor(() => expect(updatePost).toHaveBeenCalledWith('post-1', {
      title: postFixture.title,
      content: postFixture.content,
      photos: [],
    }, expect.any(AbortSignal)))
    expect(uploadPhotoFiles).not.toHaveBeenCalled()
  })

  it('keeps photo editing locked when an existing photo has no reusable key', async () => {
    const incompletePost = {
      ...postFixture,
      photoId: 'photo-1',
      photoUrl: 'https://example.com/photo-1.jpg',
      photos: [{ photoId: 'photo-1', photoKey: null, downloadUrl: 'https://example.com/photo-1.jpg' }],
    }
    vi.mocked(fetchPost).mockResolvedValue(incompletePost)
    vi.mocked(fetchMyPosts).mockResolvedValue([incompletePost])
    render(<PostEditor editPostId="post-1" />)

    expect(await screen.findByText('기존 사진 정보를 확인할 수 없어 사진 수정이 잠겨 있어요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '사진 선택' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument()
  })

  it('keeps an older overlong draft but blocks preview until its title fits 100 characters', () => {
    usePostDraftStore.getState().update({ title: '가'.repeat(101), content: '보존' })
    render(<PostEditor />)
    expect(screen.getByLabelText('제목')).toHaveValue('가'.repeat(101))
    expect(screen.getByLabelText('제목')).toHaveAttribute('maxlength', '100')
    expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('100자')
  })
  it('requires nonempty title and content for preview and publication', async () => {
    const user = userEvent.setup()
    render(<PostEditor />)
    expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '임시 저장' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '게시글 등록' })).toBeDisabled()
    expect(screen.getByLabelText('제목')).toBeRequired()
    expect(screen.getByLabelText('내용')).toBeRequired()
    await user.type(screen.getByLabelText('제목'), '  ')
    await user.type(screen.getByLabelText('내용'), '산책 이야기')
    expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled()
    await user.clear(screen.getByLabelText('제목'))
    await user.type(screen.getByLabelText('제목'), '오늘의 산책')
    await user.clear(screen.getByLabelText('내용'))
    await user.type(screen.getByLabelText('내용'), '  ')
    expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled()
    await user.clear(screen.getByLabelText('내용'))
    await user.type(screen.getByLabelText('내용'), '산책 이야기')
    await user.click(screen.getByRole('button', { name: '미리보기' }))
    expect(screen.getByRole('heading', { name: '오늘의 산책' })).toBeInTheDocument()
    expect(screen.getByLabelText('게시글 미리보기')).toHaveFocus()
    expect(screen.getByText('산책 이야기')).toBeInTheDocument()
    expect(screen.getByText('아직 게시되지 않은 글이에요.')).toBeInTheDocument()
    expect(screen.getByText('함께한 여행 이야기')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '게시글 등록' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: '임시 저장' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('아직 게시되지 않았어요')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(createPost).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '편집' }))
    expect(screen.getByLabelText('제목')).toHaveValue('오늘의 산책')
    expect(screen.getByLabelText('제목')).toHaveFocus()
  })

  it('publishes only trimmed text, clears the draft and returns to the free board after an empty success response', async () => {
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '  오늘의 산책  ')
    await user.type(screen.getByLabelText('내용'), '  함께 걸었어요.  ')
    await user.click(screen.getByRole('button', { name: '게시글 등록' }))
    await waitFor(() => expect(createPost).toHaveBeenCalledWith({
      title: '오늘의 산책',
      content: '함께 걸었어요.',
    }, expect.any(AbortSignal)))
    expect(usePostDraftStore.getState()).toMatchObject({ title: '', content: '' })
    expect(mockRouter.replace).toHaveBeenCalledWith('/community?tab=free')
  })

  it('uploads selected photos and sends their keys with the post', async () => {
    const createObjectUrl = vi.fn(() => 'blob:preview')
    const revokeObjectUrl = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl })
    vi.mocked(uploadPhotoFiles).mockResolvedValue([
      { uploadUrl: 'https://upload.example/photo', photoKey: 'post/user/photo.jpg', fileName: 'photo.jpg' },
    ])
    const user = userEvent.setup()
    render(<PostEditor />)
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText('게시글 사진 선택') as HTMLInputElement
    await user.upload(input, file)
    expect(screen.getByText('1 / 10장')).toBeInTheDocument()
    await user.type(screen.getByLabelText('제목'), '사진 글')
    await user.type(screen.getByLabelText('내용'), '사진을 공유해요')
    await user.click(screen.getByRole('button', { name: '게시글 등록' }))
    await waitFor(() => expect(uploadPhotoFiles).toHaveBeenCalledWith(
      [file],
      'POST',
      expect.any(AbortSignal),
      expect.any(Function),
    ))
    expect(createPost).toHaveBeenCalledWith({
      title: '사진 글',
      content: '사진을 공유해요',
      photos: [{ photoKey: 'post/user/photo.jpg' }],
    }, expect.any(AbortSignal))
  })

  it('identifies a likely object-storage CORS failure and keeps the draft', async () => {
    vi.mocked(uploadPhotoFiles).mockRejectedValueOnce({
      name: 'PhotoUploadError',
      stage: 'object-storage',
      reason: 'connection-or-cors',
    })
    const createObjectUrl = vi.fn(() => 'blob:preview')
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    const user = userEvent.setup()
    render(<PostEditor />)
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('게시글 사진 선택'), file)
    await user.type(screen.getByLabelText('제목'), 'CORS 추적')
    await user.type(screen.getByLabelText('내용'), '초안을 유지해요')

    await user.click(screen.getByRole('button', { name: '게시글 등록' }))

    expect(await screen.findByRole('dialog')).toHaveTextContent('사진 저장소 연결이 차단됐어요')
    expect(screen.getAllByText(/CORS 후보 기록/)).toHaveLength(2)
    expect(screen.getByLabelText('제목')).toHaveValue('CORS 추적')
    expect(screen.getByLabelText('내용')).toHaveValue('초안을 유지해요')
    expect(createPost).not.toHaveBeenCalled()
  })

  it('shows completed-photo upload progress before post creation finishes', async () => {
    const pending = deferred<void>()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.mocked(uploadPhotoFiles).mockImplementationOnce(async (_files, _type, _signal, onProgress) => {
      onProgress?.({ photoIndex: 0, photoCount: 1, status: 'uploading' })
      onProgress?.({ photoIndex: 0, photoCount: 1, status: 'success' })
      return [{ uploadUrl: 'https://upload.example/photo', photoKey: 'post/user/photo.jpg', fileName: 'photo.jpg' }]
    })
    vi.mocked(createPost).mockReturnValueOnce(pending.promise)
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.upload(screen.getByLabelText('게시글 사진 선택'), new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }))
    await user.type(screen.getByLabelText('제목'), '진행률 확인')
    await user.type(screen.getByLabelText('내용'), '업로드 상태를 확인해요')

    await user.click(screen.getByRole('button', { name: '게시글 등록' }))

    expect(await screen.findByText('완료')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('게시글을 등록하고 있어요')
    await act(async () => pending.resolve())
  })

  it('offers retry after a photo upload fails and republishes the preserved draft', async () => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.mocked(uploadPhotoFiles)
      .mockRejectedValueOnce({
        name: 'PhotoUploadError',
        stage: 'object-storage',
        reason: 'connection-or-cors',
        photoIndex: 0,
      })
      .mockResolvedValueOnce([
        { uploadUrl: 'https://upload.example/photo', photoKey: 'post/user/photo.jpg', fileName: 'photo.jpg' },
      ])
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.upload(screen.getByLabelText('게시글 사진 선택'), new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }))
    await user.type(screen.getByLabelText('제목'), '재시도 제목')
    await user.type(screen.getByLabelText('내용'), '실패해도 초안을 유지해요')
    await user.click(screen.getByRole('button', { name: '게시글 등록' }))
    await user.click(await screen.findByRole('button', { name: '닫기' }))

    await user.click(screen.getByRole('button', { name: '사진 업로드 다시 시도' }))

    await waitFor(() => expect(uploadPhotoFiles).toHaveBeenCalledTimes(2))
    expect(createPost).toHaveBeenCalledWith({
      title: '재시도 제목',
      content: '실패해도 초안을 유지해요',
      photos: [{ photoKey: 'post/user/photo.jpg' }],
    }, expect.any(AbortSignal))
  })

  it('retries only failed photos and preserves successful upload tickets in order', async () => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    const firstUpload = { photoKey: 'post/user/one.jpg', fileName: 'one.jpg' }
    const secondTicket = { uploadUrl: 'https://upload.example/two', photoKey: 'post/user/two.jpg', fileName: 'two.jpg' }
    vi.mocked(uploadPhotoFiles)
      .mockRejectedValueOnce({
        name: 'PhotoUploadError',
        stage: 'object-storage',
        reason: 'connection-or-cors',
        photoIndex: 1,
        successfulUploads: [firstUpload, null],
        failedPhotoIndexes: [1],
      })
      .mockResolvedValueOnce([secondTicket])
    const firstFile = new File(['one'], 'one.jpg', { type: 'image/jpeg' })
    const secondFile = new File(['two'], 'two.jpg', { type: 'image/jpeg' })
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.upload(screen.getByLabelText('게시글 사진 선택'), [firstFile, secondFile])
    await user.type(screen.getByLabelText('제목'), '부분 재시도')
    await user.type(screen.getByLabelText('내용'), '성공한 사진은 다시 올리지 않아요')
    await user.click(screen.getByRole('button', { name: '게시글 등록' }))

    await user.click(await screen.findByRole('button', { name: '닫기' }))
    expect(screen.getByText('완료')).toBeInTheDocument()
    expect(screen.getByText('실패')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '사진 업로드 다시 시도' }))

    await waitFor(() => expect(uploadPhotoFiles).toHaveBeenCalledTimes(2))
    expect(vi.mocked(uploadPhotoFiles).mock.calls[1][0]).toEqual([secondFile])
    expect(createPost).toHaveBeenCalledWith({
      title: '부분 재시도',
      content: '성공한 사진은 다시 올리지 않아요',
      photos: [
        { photoKey: 'post/user/one.jpg' },
        { photoKey: 'post/user/two.jpg' },
      ],
    }, expect.any(AbortSignal))
  })

  it('rejects photo selections over the 250MB per-post limit', () => {
    render(<PostEditor />)
    const largePhoto = new File(['photo'], 'large.jpg', { type: 'image/jpeg' })
    Object.defineProperty(largePhoto, 'size', { configurable: true, value: 250 * 1024 * 1024 + 1 })

    fireEvent.change(screen.getByLabelText('게시글 사진 선택'), { target: { files: [largePhoto] } })

    expect(screen.getByRole('alert')).toHaveTextContent('250MB')
    expect(screen.getByText('0 / 10장')).toBeInTheDocument()
    expect(uploadPhotoFiles).not.toHaveBeenCalled()
  })

  it('rejects a group of photos whose combined size exceeds 250MB', () => {
    render(<PostEditor />)
    const firstPhoto = new File(['one'], 'one.jpg', { type: 'image/jpeg' })
    const secondPhoto = new File(['two'], 'two.jpg', { type: 'image/jpeg' })
    Object.defineProperty(firstPhoto, 'size', { configurable: true, value: 150 * 1024 * 1024 })
    Object.defineProperty(secondPhoto, 'size', { configurable: true, value: 150 * 1024 * 1024 })

    fireEvent.change(screen.getByLabelText('게시글 사진 선택'), {
      target: { files: [firstPhoto, secondPhoto] },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('전체 첨부 합계')
    expect(screen.getByText('0 / 10장')).toBeInTheDocument()
  })

  it('separates post creation failure after photos were uploaded', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.mocked(uploadPhotoFiles).mockResolvedValueOnce([
      { uploadUrl: 'https://upload.example/photo', photoKey: 'post/user/photo.jpg', fileName: 'photo.jpg' },
    ])
    vi.mocked(createPost).mockRejectedValueOnce({ type: 'network' })
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.upload(
      screen.getByLabelText('게시글 사진 선택'),
      new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    )
    await user.type(screen.getByLabelText('제목'), '등록 단계 추적')
    await user.type(screen.getByLabelText('내용'), '초안을 유지해요')

    await user.click(screen.getByRole('button', { name: '게시글 등록' }))

    expect(await screen.findByRole('dialog')).toHaveTextContent('사진 업로드는 완료됐지만 게시글 등록에 실패했어요')
    expect(screen.getByLabelText('제목')).toHaveValue('등록 단계 추적')
    expect(createPost).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledWith(
      '[post-publish] request failed',
      expect.objectContaining({
        stage: 'post-create',
        photoUploadCompleted: true,
        type: 'network',
      })
    )
  })

  it('preserves the required text and permits retry after a failed publication', async () => {
    vi.mocked(createPost).mockRejectedValueOnce({ type: 'network' }).mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '보존할 제목')
    await user.type(screen.getByLabelText('내용'), '보존할 내용')
    await user.click(screen.getByRole('button', { name: '게시글 등록' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('인터넷 연결')
    expect(screen.getByLabelText('제목')).toHaveValue('보존할 제목')
    expect(screen.getByLabelText('내용')).toHaveValue('보존할 내용')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    await user.click(screen.getByRole('button', { name: '게시글 등록' }))
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/community?tab=free'))
    expect(createPost).toHaveBeenCalledTimes(2)
  })

  it('prevents duplicate publication while the first request is pending', async () => {
    const pending = deferred<void>()
    vi.mocked(createPost).mockReturnValue(pending.promise)
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '한 번만 등록')
    await user.type(screen.getByLabelText('내용'), '중복 요청을 막아요')
    fireEvent.click(screen.getByRole('button', { name: '게시글 등록' }))
    expect(screen.getByRole('button', { name: '등록 중…' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('게시글을 등록하고 있어요')
    expect(screen.getByRole('status')).toHaveFocus()
    expect(screen.getByRole('button', { name: '등록 중…' }).closest('[inert]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '등록 중…' }))
    expect(createPost).toHaveBeenCalledTimes(1)
    await act(async () => pending.resolve())
    expect(mockRouter.replace).toHaveBeenCalledOnce()
  })

  it('temporarily limits content to 100 characters without discarding an older draft', () => {
    usePostDraftStore.getState().update({ title: '제목', content: '가'.repeat(101) })
    render(<PostEditor />)
    expect(screen.getByLabelText('내용')).toHaveValue('가'.repeat(101))
    expect(screen.getByLabelText('내용')).toHaveAttribute('maxlength', '100')
    expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '게시글 등록' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('임시 제한인 100자')
  })

  it('aborts a pending publication and ignores its late response after the session changes', async () => {
    const pending = deferred<void>()
    vi.mocked(createPost).mockReturnValue(pending.promise)
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '세션 변경')
    await user.type(screen.getByLabelText('내용'), '늦은 응답을 무시해요')
    fireEvent.click(screen.getByRole('button', { name: '게시글 등록' }))
    const signal = vi.mocked(createPost).mock.calls[0]?.[1]
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal?.aborted).toBe(false)
    act(() => useAuthStore.setState({ sessionEpoch: 1, status: 'unauthenticated' }))
    expect(signal?.aborted).toBe(true)
    await act(async () => pending.resolve())
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it('keeps demo drafts local and never sends them to the real API', async () => {
    useAuthStore.setState({ status: 'demo' })
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '체험 제목')
    await user.type(screen.getByLabelText('내용'), '체험 내용')
    expect(screen.getByRole('button', { name: '로그인 후 등록' })).toBeDisabled()
    expect(screen.getByText(/체험 화면에서는/)).toBeInTheDocument()
    expect(createPost).not.toHaveBeenCalled()
  })

  it('keeps a draft across page navigation in the same session and returns to the free board', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '이어 쓰기')
    await user.type(screen.getByLabelText('내용'), '보관할 내용')
    await user.click(screen.getByRole('button', { name: '뒤로 가기' }))
    expect(mockRouter.replace).toHaveBeenCalledWith('/community?tab=free')
    unmount()
    render(<PostEditor />)
    expect(screen.getByLabelText('제목')).toHaveValue('이어 쓰기')
    expect(screen.getByLabelText('내용')).toHaveValue('보관할 내용')
    expect(screen.getByText(/새로고침하거나 로그아웃하면 사라져요/)).toBeInTheDocument()
  })

  it('clears private content and preview on a session change', async () => {
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '이전 계정 제목')
    await user.type(screen.getByLabelText('내용'), '이전 계정 내용')
    await user.click(screen.getByRole('button', { name: '미리보기' }))
    act(() => useAuthStore.getState().clearSession())
    expect(screen.queryByText('이전 계정 내용')).not.toBeInTheDocument()
    expect(screen.getByLabelText('제목')).toHaveValue('')
    expect(usePostDraftStore.getState().content).toBe('')
  })

  it('clears a draft after logout while the editor is unmounted', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<PostEditor />)
    await user.type(screen.getByLabelText('내용'), '비공개 초안')
    unmount()
    act(() => useAuthStore.setState({ sessionEpoch: 1, status: 'unauthenticated' }))
    act(() => useAuthStore.setState({ status: 'authenticated' }))
    render(<PostEditor />)
    expect(screen.getByLabelText('내용')).toHaveValue('')
  })

  it('warns before losing a draft to reload and removes the handler after leaving', () => {
    const { unmount } = render(<PostEditor />)
    const empty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(empty)
    expect(empty.defaultPrevented).toBe(false)
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '초안' } })
    const edited = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(edited)
    expect(edited.defaultPrevented).toBe(true)
    unmount()
    const afterLeaving = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(afterLeaving)
    expect(afterLeaving.defaultPrevented).toBe(false)
  })
})
