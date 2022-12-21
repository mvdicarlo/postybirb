import { EuiAccordion, EuiButtonIcon, EuiTitle } from '@elastic/eui';
import { useQuery } from 'react-query';
import FormGeneratorApi from '../../../../../api/form-generator.api';
import { SubmissionSectionProps } from '../../submission-form-props';
import SubmissionFormGenerator from '../submission-form-generator/submission-form-generator';

type SubmissionOptionsSectionProps = SubmissionSectionProps;

export default function SubmissionOptionsSection(
  props: SubmissionOptionsSectionProps
) {
  const { account, option, submission, onUpdate } = props;
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
    <EuiAccordion
      initialIsOpen
      id={option.id}
      buttonContent={
        <EuiTitle size="xs">
          <h4>{account?.name}</h4>
        </EuiTitle>
      }
      extraAction={
        option.isDefault ? null : (
          <EuiButtonIcon
            color="danger"
            iconType="trash"
            style={{ verticalAlign: 'middle' }}
            onClick={() => {
              // Remove option
              submission.removeOption(option);
              onUpdate();
            }}
          />
        )
      }
      paddingSize="l"
      isLoading={isLoading}
      className="euiAccordionForm"
      element="fieldset"
      buttonClassName="euiAccordionForm__button"
    >
      {isLoading ? null : (
        <SubmissionFormGenerator metadata={data} {...props} />
      )}
    </EuiAccordion>
  );
}
