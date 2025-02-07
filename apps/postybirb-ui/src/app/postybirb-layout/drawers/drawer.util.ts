export const marginOffset = 0;

export function getPortalTarget() {
  return document.getElementById('postybirb__main') as HTMLElement;
}

export function getOverlayOffset() {
  const offset = document.getElementById('postybirb__navbar')?.offsetWidth ?? 0;
  return offset + marginOffset;
}

export function getVerticalScrollbarOffset() {
  const element = document.getElementById('postybirb__main');
  if (!element) {
    return 0;
  }
  return element?.scrollHeight > element?.clientHeight ? 16 : 0;
}
