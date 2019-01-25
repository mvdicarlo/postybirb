export interface ReadFile {
  buffer: Uint8Array,
  file: File
}

export function readFile(file: File): Promise<ReadFile> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = new Uint8Array(<ArrayBuffer> reader.result);
      resolve({ file, buffer });
    }

    reader.readAsArrayBuffer(file);
  });
}
