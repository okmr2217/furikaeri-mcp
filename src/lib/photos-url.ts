export function formatDateForPhotos(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

export function encodeVarint(value: number): Buffer {
  const bytes: number[] = [];
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  bytes.push(value & 0x7f);
  return Buffer.from(bytes);
}

export function generatePhotosSearchUrl(query: string): string {
  const queryBytes = Buffer.from(query, "utf-8");
  const qLen = encodeVarint(queryBytes.length);
  const timestampMs = Date.now();

  const inner = Buffer.concat([Buffer.from([0x0a]), qLen, queryBytes]);

  const outer = Buffer.concat([
    Buffer.from([0x0a]), qLen, queryBytes,
    Buffer.from([0x22]), encodeVarint(inner.length), inner,
    Buffer.from([0x28]), encodeVarint(timestampMs),
    Buffer.from([0x38, 0x03]),
  ]);

  const encoded = outer.toString("base64");
  return `https://photos.google.com/search/${encodeURIComponent(encoded)}`;
}
