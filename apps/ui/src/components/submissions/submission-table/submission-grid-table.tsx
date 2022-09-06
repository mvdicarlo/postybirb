import { ISubmissionDto } from '@postybirb/dto';

type SubmissionGridTableProps = {
  submissions: ISubmissionDto[];
};

export function SubmissionGridTable({
  submissions,
}: SubmissionGridTableProps): JSX.Element {
  return <div>Table</div>;
}
