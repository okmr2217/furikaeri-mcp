export function formatDateForPhotos(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function encodeVarint(value: number): number[] {
  const bytes: number[] = [];
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  bytes.push(value & 0x7f);
  return bytes;
}

function concatBytes(...arrays: (number[] | Uint8Array)[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr instanceof Uint8Array ? arr : new Uint8Array(arr), offset);
    offset += arr.length;
  }
  return result;
}

export function generatePhotosSearchUrl(query: string): string {
  const queryBytes = new TextEncoder().encode(query);
  const qLen = encodeVarint(queryBytes.length);
  const timestampMs = Date.now();

  const inner = concatBytes([0x0a], qLen, queryBytes);
  const outer = concatBytes(
    [0x0a], qLen, queryBytes,
    [0x22], encodeVarint(inner.length), inner,
    [0x28], encodeVarint(timestampMs),
    [0x38, 0x03],
  );

  const encoded = btoa(String.fromCharCode(...outer));
  return `https://photos.google.com/search/${encodeURIComponent(encoded)}`;
}
