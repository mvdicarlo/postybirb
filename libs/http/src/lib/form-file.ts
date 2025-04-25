type FormFileOptions = {
  contentType: string;
  filename: string;
};

export class FormFile {
  constructor(
    private readonly value: Buffer,
    private readonly options: FormFileOptions,
  ) {}

  get buffer(): Buffer {
    return this.value;
  }

  get fileOptions(): FormFileOptions {
    return this.options;
  }

  get fileName(): string {
    return this.options.filename;
  }

  get contentType(): string {
    return this.options.contentType;
  }

  setContentType(contentType: string): void {
    this.options.contentType = contentType;
  }

  setFileName(fileName: string): void {
    this.options.filename = fileName;
  }
}
