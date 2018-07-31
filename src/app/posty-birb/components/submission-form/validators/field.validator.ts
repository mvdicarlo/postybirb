import { FormControl } from '@angular/forms';

export class FieldValidator {

  public static minimumTags(minimumTags: number) {
    return function(input: FormControl) {
      const tags: string[] = input.value || [];
      return tags.length >= minimumTags ? null : { ['minimumTags']: true };
    }
  }
}
