// Subtitle of the "Invitar amigos" row.
export function inviteMessageLine(username: string | null): string {
  return username
    ? `Con un enlace o con tu usuario @${username}`
    : 'Con un enlace';
}
