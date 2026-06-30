export const TITLE_SHORT_MAX = 50;
export const TITLE_LONG_MAX = 100;
export const DESCRIPTION_MAX = 800;

export function textLength(value: string): number {
  return [...value].length;
}

export function displayTitle(
  title: string | null | undefined,
  longTitulo?: string | null,
): string {
  return longTitulo?.trim() || title?.trim() || "";
}

export function validateTitle(
  title: string,
  required = false,
  requiredMessage = "O título é obrigatório.",
): string | null {
  const trimmed = title.trim();
  if (required && !trimmed) {
    return requiredMessage;
  }
  if (!trimmed) {
    return null;
  }
  if (textLength(trimmed) > TITLE_LONG_MAX) {
    return `O título deve ter no máximo ${TITLE_LONG_MAX} caracteres.`;
  }
  return null;
}

export function validateDescription(description: string): string | null {
  const trimmed = description.trim();
  if (!trimmed) {
    return null;
  }
  if (textLength(trimmed) > DESCRIPTION_MAX) {
    return `A descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.`;
  }
  return null;
}

export function titleHelperText(title: string): string {
  const length = textLength(title.trim());
  if (length <= TITLE_SHORT_MAX) {
    return `${length}/${TITLE_SHORT_MAX}`;
  }
  return `${length}/${TITLE_LONG_MAX} (título longo)`;
}

export function descriptionHelperText(description: string): string {
  const length = textLength(description.trim());
  return `${length}/${DESCRIPTION_MAX}`;
}
