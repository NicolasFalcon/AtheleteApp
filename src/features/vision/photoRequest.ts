// One client_request_id per photo, kept across retries of that photo: the
// server answers the same result (replayed) and charges nothing again. A new
// photo (or reset) gets a new id.
export function createPhotoRequestSession(makeId: () => string) {
  let current: { uri: string; clientRequestId: string } | null = null;
  return {
    idFor(uri: string): string {
      if (!current || current.uri !== uri) {
        current = { uri, clientRequestId: makeId() };
      }
      return current.clientRequestId;
    },
    reset() {
      current = null;
    },
  };
}
