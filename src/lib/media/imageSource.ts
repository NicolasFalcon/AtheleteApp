// The disk cache key of a signed image: the file key, never the signed URL
// (it changes on every renewal; the same key reuses the downloaded file).
export function signedImageSource(url: string, key: string): { uri: string; cacheKey: string } {
  return { uri: url, cacheKey: key };
}
