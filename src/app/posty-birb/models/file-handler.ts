export class FileHandler {
  private static acceptedFileTypes: any = {
    Story: ['txt', 'pdf', 'doc', 'docx', 'rtf', 'odt', 'md'],
    Artwork: ['png', 'jpeg', 'jpg', 'gif', 'bmp', 'tif', 'tiff'],
    Music: ['mp3', 'mid', 'wav', 'wav', 'mpeg'],
    Animation: ['swf', 'flv', 'webm', 'mp4'],
  };

  public static getTypeByExtension(file: File): string {
    const fileExtension = file.name.split('.').pop().toLowerCase();

    for (let key in this.acceptedFileTypes) {
      const type = this.acceptedFileTypes[key];
      if (type.indexOf(fileExtension) !== -1) {
        return key;
      }
    }

    return this.guessFromMimeType(file);
  }

  public static guessFromMimeType(file: File): string {
    if (file.type.includes('image')) return 'Artwork';
    if (file.type.includes('audio')) return 'Music';
    if (file.type.includes('video')) return 'Animation';
    if (file.type.includes('text')) return 'Story';
  }
}
