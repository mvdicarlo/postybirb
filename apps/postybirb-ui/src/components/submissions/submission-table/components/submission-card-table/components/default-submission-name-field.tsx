import { EuiFieldText } from '@elastic/eui';
import { IWebsiteFormFields } from '@postybirb/types';
import { useCallback } from 'react';
import { Trans } from '@lingui/macro';
import websiteOptionsApi from '../../../../../../api/website-options.api';
import { SubmissionDto } from '../../../../../../models/dtos/submission.dto';

type DefaultSubmissionNameFieldProps = {
  submission: SubmissionDto;
};

export function DefaultSubmissionNameField(
  props: DefaultSubmissionNameFieldProps
): JSX.Element {
  const { submission } = props;
  const { id: defaultOptionId, data: defaultOptions } =
    submission.getDefaultOptions();

  const submitDefaultOptionChanges = useCallback(
    (options: IWebsiteFormFields) => {
      if (JSON.stringify(options) !== JSON.stringify(defaultOptions)) {
        websiteOptionsApi.update(defaultOptionId, { data: options });
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
          <Trans id="default.name">Name</Trans>
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
