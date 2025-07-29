import { SelectOption } from '@postybirb/form-builder';

export class SelectOptionUtil {
  static findOptionById(
    options: SelectOption[],
    id: string,
  ): SelectOption | undefined {
    for (const option of options) {
      if (option.value === id) {
        return option;
      }
      if ('items' in option && option.items) {
        const found = this.findOptionById(option.items, id);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }
}
