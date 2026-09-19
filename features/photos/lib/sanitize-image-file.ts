'use client'

type ImageFormat = 'avif' | 'gif' | 'heic' | 'heif' | 'jpeg' | 'png' | 'webp'

const MIME_FORMATS: Record<string, ImageFormat> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const EXTENSION_FORMATS: Record<string, ImageFormat> = {
  avif: 'avif',
  gif: 'gif',
  heic: 'heic',
  heif: 'heif',
  jpeg: 'jpeg',
  jpg: 'jpeg',
  png: 'png',
  webp: 'webp',
}

const FORMAT_MIME_TYPES: Record<ImageFormat, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const PNG_METADATA_CHUNKS = new Set(['eXIf', 'iTXt', 'tEXt', 'tIME', 'zTXt'])

export const METADATA_SAFE_IMAGE_ACCEPT = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
  '.avif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
].join(',')

export class ImageMetadataSanitizationError extends Error {
  override readonly name = 'ImageMetadataSanitizationError'

  constructor(message = 'Image metadata could not be removed.', options?: ErrorOptions) {
    super(message, options)
  }
}

function isJpegMetadataMarker(marker: number) {
  // Keep APP0/JFIF, APP2/ICC, and APP14/Adobe because they affect rendering.
  // Other application segments commonly contain EXIF, XMP, IPTC, camera, or
  // editor metadata and are not required to decode the pixels.
  return (
    marker === 0xfe ||
    marker === 0xe1 ||
    (marker >= 0xe3 && marker <= 0xed) ||
    marker === 0xef
  )
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError')
  }
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length))
}

function concatBytes(parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0)
  const result = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function imageFormat(file: File): ImageFormat {
  const mimeFormat = MIME_FORMATS[file.type.toLowerCase()]
  const extension = file.name.split('.').at(-1)?.toLowerCase() ?? ''
  const extensionFormat = EXTENSION_FORMATS[extension]
  if (file.type && !mimeFormat) {
    throw new ImageMetadataSanitizationError('Unsupported image content type.')
  }
  if (!mimeFormat && !extensionFormat) {
    throw new ImageMetadataSanitizationError('Unsupported image format.')
  }
  if (mimeFormat && extensionFormat && mimeFormat !== extensionFormat) {
    throw new ImageMetadataSanitizationError('Image extension and content type did not match.')
  }
  return mimeFormat ?? extensionFormat
}

export function isSupportedMetadataSafeImage(
  file: Pick<File, 'name' | 'type'>
) {
  try {
    imageFormat(file as File)
    return true
  } catch {
    return false
  }
}

function stripJpegMetadata(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new ImageMetadataSanitizationError('JPEG signature was invalid.')
  }

  const parts = [bytes.slice(0, 2)]
  let offset = 2
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      throw new ImageMetadataSanitizationError('JPEG segment was invalid.')
    }
    let markerIndex = offset + 1
    while (markerIndex < bytes.length && bytes[markerIndex] === 0xff) markerIndex += 1
    if (markerIndex >= bytes.length) {
      throw new ImageMetadataSanitizationError('JPEG marker was incomplete.')
    }

    const marker = bytes[markerIndex]
    if (marker === 0xda) {
      parts.push(bytes.slice(offset))
      return concatBytes(parts)
    }
    if (marker === 0xd9) {
      parts.push(bytes.slice(offset, markerIndex + 1))
      return concatBytes(parts)
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      parts.push(bytes.slice(offset, markerIndex + 1))
      offset = markerIndex + 1
      continue
    }

    const lengthOffset = markerIndex + 1
    if (lengthOffset + 1 >= bytes.length) {
      throw new ImageMetadataSanitizationError('JPEG segment length was missing.')
    }
    const segmentLength = (bytes[lengthOffset] << 8) | bytes[lengthOffset + 1]
    const segmentEnd = lengthOffset + segmentLength
    if (segmentLength < 2 || segmentEnd > bytes.length) {
      throw new ImageMetadataSanitizationError('JPEG segment length was invalid.')
    }
    if (!isJpegMetadataMarker(marker)) {
      parts.push(bytes.slice(offset, segmentEnd))
    }
    offset = segmentEnd
  }

  throw new ImageMetadataSanitizationError('JPEG image data was incomplete.')
}

function readJpegOrientation(bytes: Uint8Array) {
  let offset = 2
  while (offset + 4 < bytes.length && bytes[offset] === 0xff) {
    let markerIndex = offset + 1
    while (markerIndex < bytes.length && bytes[markerIndex] === 0xff) markerIndex += 1
    const marker = bytes[markerIndex]
    if (marker === 0xda || marker === 0xd9) return null
    const lengthOffset = markerIndex + 1
    if (lengthOffset + 1 >= bytes.length) return null
    const segmentLength = (bytes[lengthOffset] << 8) | bytes[lengthOffset + 1]
    const segmentEnd = lengthOffset + segmentLength
    if (segmentLength < 2 || segmentEnd > bytes.length) return null

    const payloadStart = lengthOffset + 2
    if (marker === 0xe1 && ascii(bytes, payloadStart, 6) === 'Exif\0\0') {
      const tiffStart = payloadStart + 6
      if (tiffStart + 8 > segmentEnd) return null
      const byteOrder = ascii(bytes, tiffStart, 2)
      const littleEndian = byteOrder === 'II'
      if (!littleEndian && byteOrder !== 'MM') return null
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      if (view.getUint16(tiffStart + 2, littleEndian) !== 42) return null
      const ifdOffset = view.getUint32(tiffStart + 4, littleEndian)
      const ifdStart = tiffStart + ifdOffset
      if (ifdStart + 2 > segmentEnd) return null
      const entryCount = view.getUint16(ifdStart, littleEndian)
      for (let index = 0; index < entryCount; index += 1) {
        const entry = ifdStart + 2 + index * 12
        if (entry + 12 > segmentEnd) return null
        if (view.getUint16(entry, littleEndian) !== 0x0112) continue
        const orientation = view.getUint16(entry + 8, littleEndian)
        return orientation >= 1 && orientation <= 8 ? orientation : null
      }
      return null
    }
    offset = segmentEnd
  }
  return null
}

function stripPngMetadata(bytes: Uint8Array) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (bytes.length < 20 || signature.some((value, index) => bytes[index] !== value)) {
    throw new ImageMetadataSanitizationError('PNG signature was invalid.')
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const parts = [bytes.slice(0, 8)]
  let offset = 8
  let foundEnd = false
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) {
      throw new ImageMetadataSanitizationError('PNG chunk was incomplete.')
    }
    const dataLength = view.getUint32(offset)
    const chunkEnd = offset + 12 + dataLength
    if (chunkEnd > bytes.length) {
      throw new ImageMetadataSanitizationError('PNG chunk length was invalid.')
    }
    const chunkType = ascii(bytes, offset + 4, 4)
    if (!PNG_METADATA_CHUNKS.has(chunkType)) {
      parts.push(bytes.slice(offset, chunkEnd))
    }
    offset = chunkEnd
    if (chunkType === 'IEND') {
      foundEnd = true
      break
    }
  }
  if (!foundEnd) throw new ImageMetadataSanitizationError('PNG end chunk was missing.')
  return concatBytes(parts)
}

function stripWebpMetadata(bytes: Uint8Array) {
  if (
    bytes.length < 20 ||
    ascii(bytes, 0, 4) !== 'RIFF' ||
    ascii(bytes, 8, 4) !== 'WEBP'
  ) {
    throw new ImageMetadataSanitizationError('WEBP signature was invalid.')
  }

  const parts = [bytes.slice(0, 12)]
  let offset = 12
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) {
      throw new ImageMetadataSanitizationError('WEBP chunk was incomplete.')
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4)
    const dataLength = view.getUint32(0, true)
    const paddedLength = dataLength + (dataLength % 2)
    const chunkEnd = offset + 8 + paddedLength
    if (chunkEnd > bytes.length) {
      throw new ImageMetadataSanitizationError('WEBP chunk length was invalid.')
    }
    const chunkType = ascii(bytes, offset, 4)
    if (chunkType !== 'EXIF' && chunkType !== 'XMP ') {
      const chunk = bytes.slice(offset, chunkEnd)
      if (chunkType === 'VP8X' && dataLength >= 1) {
        // Clear the EXIF and XMP feature flags after removing those chunks.
        chunk[8] &= ~(0x08 | 0x04)
      }
      parts.push(chunk)
    }
    offset = chunkEnd
  }

  const result = concatBytes(parts)
  const resultView = new DataView(result.buffer)
  resultView.setUint32(4, result.length - 8, true)
  return result
}

function gifSubBlocksEnd(bytes: Uint8Array, start: number) {
  let offset = start
  while (offset < bytes.length) {
    const length = bytes[offset]
    offset += 1
    if (length === 0) return offset
    offset += length
    if (offset > bytes.length) break
  }
  throw new ImageMetadataSanitizationError('GIF data block was incomplete.')
}

function stripGifMetadata(bytes: Uint8Array) {
  const version = ascii(bytes, 0, 6)
  if (bytes.length < 14 || (version !== 'GIF87a' && version !== 'GIF89a')) {
    throw new ImageMetadataSanitizationError('GIF signature was invalid.')
  }

  const globalColorTableSize = bytes[10] & 0x80
    ? 3 * 2 ** ((bytes[10] & 0x07) + 1)
    : 0
  let offset = 13 + globalColorTableSize
  if (offset > bytes.length) throw new ImageMetadataSanitizationError('GIF color table was invalid.')
  const parts = [bytes.slice(0, offset)]

  while (offset < bytes.length) {
    const blockStart = offset
    const introducer = bytes[offset]
    if (introducer === 0x3b) {
      parts.push(bytes.slice(offset, offset + 1))
      return concatBytes(parts)
    }
    if (introducer === 0x21) {
      if (offset + 2 >= bytes.length) {
        throw new ImageMetadataSanitizationError('GIF extension was incomplete.')
      }
      const label = bytes[offset + 1]
      const blockLength = bytes[offset + 2]
      const blockEnd = gifSubBlocksEnd(bytes, offset + 2)
      let keep = label !== 0xfe && label !== 0x01
      if (label === 0xff) {
        const applicationId = ascii(bytes, offset + 3, Math.min(blockLength, 11))
        keep = applicationId === 'NETSCAPE2.0' || applicationId === 'ANIMEXTS1.0'
      }
      if (keep) parts.push(bytes.slice(blockStart, blockEnd))
      offset = blockEnd
      continue
    }
    if (introducer === 0x2c) {
      if (offset + 10 > bytes.length) {
        throw new ImageMetadataSanitizationError('GIF image descriptor was incomplete.')
      }
      const localColorTableSize = bytes[offset + 9] & 0x80
        ? 3 * 2 ** ((bytes[offset + 9] & 0x07) + 1)
        : 0
      const imageDataStart = offset + 10 + localColorTableSize
      if (imageDataStart >= bytes.length) {
        throw new ImageMetadataSanitizationError('GIF image data was incomplete.')
      }
      const blockEnd = gifSubBlocksEnd(bytes, imageDataStart + 1)
      parts.push(bytes.slice(blockStart, blockEnd))
      offset = blockEnd
      continue
    }
    throw new ImageMetadataSanitizationError('GIF block type was invalid.')
  }

  throw new ImageMetadataSanitizationError('GIF trailer was missing.')
}

function validateIsoImage(bytes: Uint8Array) {
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== 'ftyp') {
    throw new ImageMetadataSanitizationError('ISO image signature was invalid.')
  }
}

async function loadImageSource(file: File) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return {
      source: bitmap as CanvasImageSource,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    }
  }
  if (typeof Image === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new ImageMetadataSanitizationError('This browser cannot decode the selected image.')
  }

  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Image decode failed.'))
      element.src = url
    })
    return {
      source: image as CanvasImageSource,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => undefined,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function reencodeImageWithoutMetadata(file: File, signal?: AbortSignal) {
  throwIfAborted(signal)
  if (typeof document === 'undefined') {
    throw new ImageMetadataSanitizationError('This environment cannot sanitize the image.')
  }

  let decoded: Awaited<ReturnType<typeof loadImageSource>> | null = null
  try {
    decoded = await loadImageSource(file)
    throwIfAborted(signal)
    if (!decoded.width || !decoded.height) {
      throw new ImageMetadataSanitizationError('Decoded image dimensions were invalid.')
    }
    const canvas = document.createElement('canvas')
    canvas.width = decoded.width
    canvas.height = decoded.height
    const context = canvas.getContext('2d')
    if (!context) throw new ImageMetadataSanitizationError('Image canvas was unavailable.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(decoded.source, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => value ? resolve(value) : reject(new Error('Image encoding failed.')),
        'image/jpeg',
        0.92
      )
    })
    throwIfAborted(signal)
    return new File(
      [blob],
      file.name.replace(/\.[^.]+$/, '') + '.jpg',
      { type: 'image/jpeg', lastModified: file.lastModified }
    )
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? error
    if (error instanceof ImageMetadataSanitizationError) throw error
    throw new ImageMetadataSanitizationError(undefined, { cause: error })
  } finally {
    decoded?.release()
  }
}

export async function sanitizeImageFile(file: File, signal?: AbortSignal): Promise<File> {
  throwIfAborted(signal)
  const format = imageFormat(file)
  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await file.arrayBuffer())
  } catch (error) {
    throw new ImageMetadataSanitizationError('Image file could not be read.', { cause: error })
  }
  throwIfAborted(signal)

  if (format === 'avif' || format === 'heic' || format === 'heif') {
    validateIsoImage(bytes)
    return reencodeImageWithoutMetadata(file, signal)
  }

  if (format === 'jpeg' && (readJpegOrientation(bytes) ?? 1) !== 1) {
    return reencodeImageWithoutMetadata(file, signal)
  }

  const sanitized = format === 'jpeg'
    ? stripJpegMetadata(bytes)
    : format === 'png'
      ? stripPngMetadata(bytes)
      : format === 'webp'
        ? stripWebpMetadata(bytes)
        : stripGifMetadata(bytes)

  return new File([sanitized], file.name, {
    type: FORMAT_MIME_TYPES[format],
    lastModified: file.lastModified,
  })
}

export async function sanitizeImageFiles(files: File[], signal?: AbortSignal) {
  const sanitized: File[] = []
  // Process sequentially to avoid decoding several large mobile photos at once.
  for (const file of files) {
    sanitized.push(await sanitizeImageFile(file, signal))
  }
  return sanitized
}
