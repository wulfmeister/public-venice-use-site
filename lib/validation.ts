export const isValidUrl = (value?: string | null) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isValidZip = (value: string) => /^\d{5}(-\d{4})?$/.test(value.trim());

export const isValidDataUrl = (value: string, allowedMimeTypes: string[]) => {
  const match = value.match(/^data:([^;]+);base64,/i);
  if (!match) return false;
  return allowedMimeTypes.includes(match[1]);
};

export const isValidRole = (role: string): role is 'user' | 'assistant' | 'system' =>
  ['user', 'assistant', 'system'].includes(role);

export const isValidWebSearchMode = (mode?: string) =>
  mode === undefined || ['auto', 'on', 'off'].includes(mode);

export const isPositiveInteger = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

export const isNonEmptyString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0;
