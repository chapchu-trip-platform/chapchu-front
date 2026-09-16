function jpegSegment(marker: number, payload: Uint8Array) {
  const length = payload.length + 2
  return new Uint8Array([
    0xff,
    marker,
    (length >> 8) & 0xff,
    length & 0xff,
    ...payload,
  ])
}

export function jpegFileWithMetadata(
  name = 'photo.jpg',
  options: { lastModified?: number; metadata?: string } = {}
) {
  const encoder = new TextEncoder()
  const metadata = options.metadata ?? 'Exif\0\0GPS=37.5444,127.0374;Owner=private'
  const parts = [
    new Uint8Array([0xff, 0xd8]),
    jpegSegment(0xe0, encoder.encode('JFIF\0')),
    jpegSegment(0xe1, encoder.encode(metadata)),
    jpegSegment(0xed, encoder.encode('IPTC private caption')),
    jpegSegment(0xfe, encoder.encode('private comment')),
    new Uint8Array([0xff, 0xda, 0x00, 0x02, 0x01, 0x02, 0x03, 0xff, 0xd9]),
  ]

  return new File(parts, name, {
    type: 'image/jpeg',
    lastModified: options.lastModified,
  })
}
