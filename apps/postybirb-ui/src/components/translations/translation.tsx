import { Trans } from '@lingui/macro';
import { ValidationMessage, ValidationMessages } from '@postybirb/types';

type TranslationsMap = {
  [K in keyof ValidationMessages]: (
    props: Omit<ValidationMessage<object, K>, 'field' | 'id'>
  ) => JSX.Element;
};
export const TranslationMessages: Partial<TranslationsMap> = {
  'validation.description.max-length': (props) => {
    const maxLength = props.values?.maxLength ?? 0;
    return (
      <Trans>Description is greater than {maxLength} characters long</Trans>
    );
  },
};

export function ValidationTranslation(
  props: Omit<ValidationMessage, 'field'>
): JSX.Element {
  const { id } = props;
  const translation = TranslationMessages[id];
  if (translation) {
    return translation(
      // @ts-expect-error Typescript does not know union type
      props
    );
  }

  return <Trans>Translation {id} not found</Trans>;
}
