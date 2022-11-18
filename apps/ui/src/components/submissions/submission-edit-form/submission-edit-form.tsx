import { useMemo } from 'react';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import SubmissionFormSection from './components/submission-form-section/submission-form-section';
import SubmissionOptionsSection from './components/submission-options-section/submission-options-section';
import './submission-edit-form.css';

type SubmissionEditFormProps = {
  submission: SubmissionDto;
};

export default function SubmissionEditForm(props: SubmissionEditFormProps) {
  const { submission } = props;

  const optionSections = useMemo(() => {
    const defaultOptions = submission.getDefaultOptions();
    const otherOptions = submission.options.filter((o) => !!o.account);
    return [defaultOptions, ...otherOptions].map((o) => (
      <SubmissionFormSection key={o.id}>
        <SubmissionOptionsSection option={o} submission={submission} />
      </SubmissionFormSection>
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission.options]);

  return <div className="postybirb__submission-form">{optionSections}</div>;
}
