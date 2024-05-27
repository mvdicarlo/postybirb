export const marginOffset = 14;

export function getPortalTarget() {
  return document.getElementById('postybirb__main')!;
}

export function getOverlayOffset() {
  const offset = document.getElementById('postybirb__navbar')?.offsetWidth ?? 0;
  return offset + marginOffset;
}
