import { EuiFieldText } from '@elastic/eui';
import { ISubmissionDto } from '@postybirb/dto';
import { BaseWebsiteOptions, ISubmissionOptions } from '@postybirb/types';
import { useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import SubmissionOptionsApi from '../../../../../api/submission-options.api';

type DefaultSubmissionNameFieldProps = {
  submission: ISubmissionDto;
};

function getDefaultOptions<T extends BaseWebsiteOptions>(
  submission: ISubmissionDto
): ISubmissionOptions<T> {
  return submission.options.find((o) => !o.account) as ISubmissionOptions<T>;
}

export function DefaultSubmissionNameField(
  props: DefaultSubmissionNameFieldProps
): JSX.Element {
  const { submission } = props;
  const { id: defaultOptionId, data: defaultOptions } =
    getDefaultOptions(submission);

  const submitDefaultOptionChanges = useCallback(
    (options: BaseWebsiteOptions) => {
      if (JSON.stringify(options) !== JSON.stringify(defaultOptions)) {
        SubmissionOptionsApi.update({ id: defaultOptionId, data: options });
      }
    },
    [defaultOptionId, defaultOptions]
  );

  return (
    <EuiFieldText
      compressed
      fullWidth
      prepend={
        // eslint-disable-next-line jsx-a11y/label-has-associated-control
        <label className="euiFormLabel euiFormControlLayout__prepend">
          <FormattedMessage id="default.name" defaultMessage="Name" />
        </label>
      }
      isInvalid={!defaultOptions.title?.length}
      defaultValue={defaultOptions.title || ''}
      onBlur={(event) => {
        submitDefaultOptionChanges({
          ...defaultOptions,
          title: event.target.value.trim(),
        });
      }}
    />
  );
}
