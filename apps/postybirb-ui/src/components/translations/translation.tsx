import { DynamicObject } from '@postybirb/types';
import { FormattedMessage } from 'react-intl';

const translations: Record<string, (props: TranslationProps) => JSX.Element> = {
  'validation.description.max-length': (
    props: TranslationProps
  ): JSX.Element => (
    <FormattedMessage
      {...props}
      defaultMessage="Description is greater than {maxLength, number} characters long"
    />
  ),
};

type TranslationProps = {
  id: string;
  // eslint-disable-next-line react/require-default-props, react/no-unused-prop-types
  values?: DynamicObject;
};

export default function Translation(props: TranslationProps): JSX.Element {
  const { id } = props;
  const translation = translations[id];
  if (translation !== undefined) {
    return translation(props);
  }

  return <p>Translation {id} not found</p>;
}
