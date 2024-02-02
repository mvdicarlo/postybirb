import { Trans } from '@lingui/macro';
import { ValidationMessage, ValidationMessages } from '@postybirb/types';

type TranslationsMap = {
  [K in keyof ValidationMessages]: (
    props: Omit<ValidationMessage<object, K>, 'field'>
  ) => JSX.Element;
};

const translations: TranslationsMap = {
  'validation.description.max-length': (props) => {
    const maxLength = props.values?.maxLength ?? 0;
    return (
      <Trans>Description is greater than {maxLength} characters long</Trans>
    );
  },
};

export default function Translation(
  props: Omit<ValidationMessage<object>, 'field'>
): JSX.Element {
  const { id } = props;
  const translation = translations[id];
  if (translation !== undefined) {
    return translation(props);
  }

  return <Trans>Translation {id} not found</Trans>;
}
