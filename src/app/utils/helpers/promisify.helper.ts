export class Promisify {
  public static wait(ms: number): Promise < void > {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
