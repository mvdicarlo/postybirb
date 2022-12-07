import { EuiSpacer } from '@elastic/eui';
import { IAccountDto } from '@postybirb/dto';
import SubmissionFormSection from './components/submission-form-section/submission-form-section';
import { SubmissionFormWebsiteSelect } from './components/submission-form-website-select/submission-form-website-select';
import SubmissionOptionsSection from './components/submission-options-section/submission-options-section';
import './submission-edit-form.css';
import { SubmissionFormProps } from './submission-form-props';

type SubmissionEditFormProps = SubmissionFormProps & {
  accounts: IAccountDto[];
};

export default function SubmissionEditForm(props: SubmissionEditFormProps) {
  const { accounts, submission, onUpdate } = props;

  const defaultOptions = submission.getDefaultOptions();
  const otherOptions = submission.options.filter((o) => !!o.account);

  // TODO group by account display name

  return (
    <div className="postybirb__submission-form">
      <SubmissionFormSection>
        <SubmissionFormWebsiteSelect {...props} />
      </SubmissionFormSection>
      <EuiSpacer />
      {[defaultOptions, ...otherOptions].map((o) => (
        <SubmissionFormSection key={o.id}>
          <SubmissionOptionsSection
            option={o}
            submission={submission}
            onUpdate={onUpdate}
          />
        </SubmissionFormSection>
      ))}
    </div>
  );
}
