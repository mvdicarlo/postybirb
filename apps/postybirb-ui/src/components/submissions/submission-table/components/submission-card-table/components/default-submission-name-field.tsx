import { EuiFieldText } from '@elastic/eui';
import { IBaseWebsiteOptions } from '@postybirb/types';
import { useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import WebsiteOptionsApi from '../../../../../../api/website-options.api';
import { SubmissionDto } from '../../../../../../models/dtos/submission.dto';

type DefaultSubmissionNameFieldProps = {
  submission: SubmissionDto;
};

export function DefaultSubmissionNameField(
  props: DefaultSubmissionNameFieldProps
): JSX.Element {
  const { submission } = props;
  const { id: defaultOptionId, data: defaultOptions } =
    submission.getDefaultOptions(submission);

  const submitDefaultOptionChanges = useCallback(
    (options: IBaseWebsiteOptions) => {
      if (JSON.stringify(options) !== JSON.stringify(defaultOptions)) {
        WebsiteOptionsApi.update({ id: defaultOptionId, data: options });
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
