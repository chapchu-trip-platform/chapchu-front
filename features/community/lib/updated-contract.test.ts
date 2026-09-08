import { describe, expect, it } from 'vitest'
import { parseComment, parsePost } from './community-model'
import { commentFixture, postFixture } from '@/test/fixtures/community'

describe('updated server contract', () => {
  it('accepts a deleted parent with a null author', () => {
    expect(parseComment({ ...commentFixture, deleted: true, nickname: null, content: '삭제된 댓글입니다' })).toMatchObject({ deleted: true, nickname: null })
  })
  it('rejects missing or non-boolean personal reaction flags', () => {
    expect(() => parsePost({ ...postFixture, recommended: undefined })).toThrow()
    expect(() => parsePost({ ...postFixture, bookmarked: 'false' })).toThrow()
  })
})
