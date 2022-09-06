import { ISubmissionDto } from '@postybirb/dto';

type SubmissionCardTableProps = {
  submissions: ISubmissionDto[];
};

export function SubmissionCardTable({
  submissions,
}: SubmissionCardTableProps): JSX.Element {
  return <div>Card</div>;
}
