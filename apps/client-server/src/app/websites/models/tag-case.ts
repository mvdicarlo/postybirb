import { SelectField } from '@postybirb/form-builder';

/**
 * How a tag made of several words is written on websites whose tags cannot
 * hold spaces.
 */
export type TagCase = 'snake' | 'camel' | 'pascal' | 'lower';

/**
 * Lets the user pick the {@link TagCase} of a website. Put it on a `tagCase`
 * property, `BaseWebsiteOptions.getProcessedTags` reads it from there.
 */
export function TagCaseField(layout: { section?: string } = {}) {
  return SelectField({
    ...layout,
    label: 'tagCase',
    options: [
      { value: 'snake', label: 'snake_case' },
      { value: 'camel', label: 'camelCase' },
      { value: 'pascal', label: 'PascalCase' },
      { value: 'lower', label: 'lowercase' },
    ],
    span: 6,
  });
}

function capitalize(word: string): string {
  return word.replace(/^\p{Ll}/u, (letter) => letter.toUpperCase());
}

/**
 * Joins the words of a tag in the given case. In `camel` and `pascal`, letters
 * are only ever capitalized, so what the user typed in upper case stays that
 * way (`my OC` gives `myOC`). `lower` is the only case that lowers letters
 * (`my OC` gives `myoc`). `snake` leaves the tag as is: the space replacer of
 * the tag field takes care of it.
 */
export function applyTagCase(tag: string, tagCase?: TagCase): string {
  if (tagCase !== 'camel' && tagCase !== 'pascal' && tagCase !== 'lower') {
    return tag;
  }

  const words = tag.split(/\s+/).filter((word) => word.length > 0);

  if (tagCase === 'lower') {
    return words.join('').toLowerCase();
  }

  return words
    .map((word, index) =>
      index === 0 && tagCase === 'camel' ? word : capitalize(word),
    )
    .join('');
}
