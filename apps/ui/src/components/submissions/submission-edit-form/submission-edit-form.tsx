import { useMemo } from 'react';
import SubmissionFormSection from './components/submission-form-section/submission-form-section';
import SubmissionOptionsSection from './components/submission-options-section/submission-options-section';
import './submission-edit-form.css';
import { SubmissionFormProps } from './submission-form-props';

type SubmissionEditFormProps = SubmissionFormProps;

export default function SubmissionEditForm(props: SubmissionEditFormProps) {
  const { submission, onUpdate } = props;

  const optionSections = useMemo(() => {
    const defaultOptions = submission.getDefaultOptions();
    const otherOptions = submission.options.filter((o) => !!o.account);
    return [defaultOptions, ...otherOptions].map((o) => (
      <SubmissionFormSection key={o.id}>
        <SubmissionOptionsSection
          option={o}
          submission={submission}
          onUpdate={onUpdate}
        />
      </SubmissionFormSection>
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission]);

  return <div className="postybirb__submission-form">{optionSections}</div>;
}
