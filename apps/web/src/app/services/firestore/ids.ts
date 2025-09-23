export const slugifyId = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export const ensureId = (id: string | undefined, fallbackName: string): string => {
  if (id?.length) {
    return id;
  }

  const slug = slugifyId(fallbackName);
  if (slug.length >= 4) {
    return slug;
  }

  return `item-${Math.random().toString(36).slice(2, 8)}`;
};
