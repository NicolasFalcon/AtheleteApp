// Random v4-shaped id (not security sensitive): the folder of a post photo in
// `social-photos` (`{uid}/{uuid}/photo.jpg`).
export function createUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, token => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : 8 + (random % 4);
    return value.toString(16);
  });
}
