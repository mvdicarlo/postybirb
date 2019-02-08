
export function isGIF(file: { type: string }): boolean {
  return isImage(file) && isType(file, 'gif');
}

export function isImage(file: { type: string }): boolean {
  return file.type.includes('image');
}

export function isType(file: { type: string }, type: string): boolean {
  return file.type.includes(type);
}

export function MBtoBytes(size: any): number {
  return Number(size) * Math.pow(1024, 2);
}
