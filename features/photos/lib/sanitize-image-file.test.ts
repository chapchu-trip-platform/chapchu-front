import { describe, expect, it } from 'vitest'
import {
  ImageMetadataSanitizationError,
  sanitizeImageFile,
} from '@/features/photos/lib/sanitize-image-file'
import { jpegFileWithMetadata } from '@/test/fixtures/images'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function pngChunk(type: string, payload: Uint8Array) {
  const chunk = new Uint8Array(12 + payload.length)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, payload.length)
  chunk.set(encoder.encode(type), 4)
  chunk.set(payload, 8)
  // CRC is irrelevant to removal and the untouched bytes remain unchanged.
  return chunk
}

function webpChunk(type: string, payload: Uint8Array) {
  const chunk = new Uint8Array(8 + payload.length + (payload.length % 2))
  chunk.set(encoder.encode(type), 0)
  new DataView(chunk.buffer).setUint32(4, payload.length, true)
  chunk.set(payload, 8)
  return chunk
}

function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  parts.forEach((part) => {
    output.set(part, offset)
    offset += part.length
  })
  return output
}

async function fileBytes(file: File) {
  return new Uint8Array(await file.arrayBuffer())
}

describe('sanitizeImageFile', () => {
  it('removes EXIF/GPS, IPTC, and comment segments from JPEG files', async () => {
    const original = jpegFileWithMetadata('산책.jpg', {
      lastModified: 1234,
      metadata: 'Exif\0\0GPS=37.5444,127.0374;Owner=private',
    })

    const sanitized = await sanitizeImageFile(original)
    const contents = decoder.decode(await fileBytes(sanitized))

    expect(sanitized).not.toBe(original)
    expect(sanitized.name).toBe('산책.jpg')
    expect(sanitized.type).toBe('image/jpeg')
    expect(sanitized.lastModified).toBe(1234)
    expect(contents).toContain('JFIF')
    expect(contents).not.toContain('GPS=')
    expect(contents).not.toContain('Owner=private')
    expect(contents).not.toContain('IPTC private caption')
    expect(contents).not.toContain('private comment')
  })

  it('removes textual, time, and EXIF chunks from PNG files', async () => {
    const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
    const bytes = concat([
      signature,
      pngChunk('IHDR', new Uint8Array(13)),
      pngChunk('eXIf', encoder.encode('private GPS')),
      pngChunk('tEXt', encoder.encode('Owner=private')),
      pngChunk('IDAT', new Uint8Array([1, 2, 3])),
      pngChunk('IEND', new Uint8Array()),
    ])

    const sanitized = await sanitizeImageFile(
      new File([bytes], 'photo.png', { type: 'image/png' })
    )
    const contents = decoder.decode(await fileBytes(sanitized))

    expect(contents).toContain('IHDR')
    expect(contents).toContain('IDAT')
    expect(contents).not.toContain('eXIf')
    expect(contents).not.toContain('Owner=private')
  })

  it('removes EXIF and XMP chunks and clears their WEBP feature flags', async () => {
    const vp8x = new Uint8Array(10)
    vp8x[0] = 0x0c
    const body = concat([
      webpChunk('VP8X', vp8x),
      webpChunk('EXIF', encoder.encode('GPS private')),
      webpChunk('XMP ', encoder.encode('Owner private')),
      webpChunk('VP8 ', new Uint8Array([1, 2, 3, 4])),
    ])
    const bytes = new Uint8Array(12 + body.length)
    bytes.set(encoder.encode('RIFF'), 0)
    new DataView(bytes.buffer).setUint32(4, bytes.length - 8, true)
    bytes.set(encoder.encode('WEBP'), 8)
    bytes.set(body, 12)

    const sanitized = await sanitizeImageFile(
      new File([bytes], 'photo.webp', { type: 'image/webp' })
    )
    const output = await fileBytes(sanitized)
    const contents = decoder.decode(output)

    expect(contents).toContain('VP8X')
    expect(contents).toContain('VP8 ')
    expect(contents).not.toContain('EXIF')
    expect(contents).not.toContain('XMP ')
    expect(output[20] & 0x0c).toBe(0)
    expect(new DataView(output.buffer).getUint32(4, true)).toBe(output.length - 8)
  })

  it('removes GIF comments while preserving its image data', async () => {
    const comment = encoder.encode('GPS private')
    const bytes = new Uint8Array([
      ...encoder.encode('GIF89a'),
      1, 0, 1, 0, 0, 0, 0,
      0x21, 0xfe, comment.length, ...comment, 0,
      0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0,
      2, 2, 0x4c, 0x01, 0,
      0x3b,
    ])

    const sanitized = await sanitizeImageFile(
      new File([bytes], 'photo.gif', { type: 'image/gif' })
    )
    const output = await fileBytes(sanitized)

    expect(decoder.decode(output)).not.toContain('GPS private')
    expect(output[output.length - 1]).toBe(0x3b)
    expect(output).toContain(0x2c)
  })

  it('rejects a malformed or disguised image instead of uploading the original', async () => {
    await expect(
      sanitizeImageFile(new File(['not an image'], 'photo.jpg', { type: 'image/jpeg' }))
    ).rejects.toBeInstanceOf(ImageMetadataSanitizationError)
    await expect(
      sanitizeImageFile(new File(['<svg/>'], 'photo.svg', { type: 'image/svg+xml' }))
    ).rejects.toBeInstanceOf(ImageMetadataSanitizationError)
  })
})
