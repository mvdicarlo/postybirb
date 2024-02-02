type IteratableType = string | number | Date | boolean;

export class ArrayHelper {
  static unique<T extends IteratableType>(arr: T[]): T[] {
    const uniqueArr: T[] = [];

    const seen: Record<string, boolean> = {};

    arr.forEach((item) => {
      const name = item.toString();
      if (!seen[name]) {
        seen[name] = true;
        uniqueArr.push(item);
      }
    });

    return uniqueArr;
  }
}
