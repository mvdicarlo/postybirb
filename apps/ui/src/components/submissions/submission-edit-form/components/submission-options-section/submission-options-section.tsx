import { EuiLoadingSpinner, EuiSpacer, EuiTitle } from '@elastic/eui';
import { BaseWebsiteOptions, ISubmissionOptions } from '@postybirb/types';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import FormGeneratorApi from '../../../../../api/form-generator.api';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';

type SubmissionOptionsSectionProps = {
  option: ISubmissionOptions<BaseWebsiteOptions>;
  submission: SubmissionDto;
  onUpdate: () => void;
};

export default function SubmissionOptionsSection(
  props: SubmissionOptionsSectionProps
) {
  const { option, submission, onUpdate } = props;
  const { isLoading, data } = useQuery(
    [option.id],
    async () =>
      (
        await (option.account
          ? FormGeneratorApi.getForm({
              account: option.account,
              type: submission.type,
            })
          : FormGeneratorApi.getDefaultForm())
      ).body,
    {
      refetchOnWindowFocus: false,
    }
  );
  return (
    <div className="postybirb__submission-options-section">
      <EuiTitle size="s">
        <h4>
          {option.account ? (
            <span>
              {option.account.name} - {option.account.name}
            </span>
          ) : (
            <FormattedMessage
              id="default-options"
              defaultMessage="Default Options"
            />
          )}
        </h4>
      </EuiTitle>
      <EuiSpacer />
      {isLoading ? <EuiLoadingSpinner /> : null}
    </div>
  );
}
