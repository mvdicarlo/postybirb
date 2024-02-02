import { PropsWithChildren } from 'react';

type SubmissionFormSectionProps = PropsWithChildren<unknown>;

export default function SubmissionFormSection({
  children,
}: SubmissionFormSectionProps) {
  return <div className="postybirb__submission-form-section">{children}</div>;
}
