import type { Timestamp } from 'firebase/firestore';

export const timestampToIsoString = (value?: Timestamp | null): string | null => {
  if (!value) {
    return null;
  }

  try {
    return value.toDate().toISOString();
  } catch (error) {
    console.error('Failed to convert timestamp', error);
    return null;
  }
};

export const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return fallback;
};

export const toNonNegativeNumber = (value: unknown, fallback = 0): number => {
  const numeric = toNumber(value, fallback);
  return numeric < 0 ? fallback : numeric;
};
