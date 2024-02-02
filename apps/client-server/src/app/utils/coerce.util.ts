export class Coerce {
  static boolean(value: string | boolean): boolean {
    return !!value.toString().match(/^(true|[1-9][0-9]*|[0-9]*[1-9]+|yes)$/i);
  }
}
