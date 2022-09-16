import { EuiCard } from '@elastic/eui';
import { ISubmissionDto } from '@postybirb/dto';
import { getUrlSource } from '../../../../../transports/https';
import { SubmissionTableCardTitle } from './submission-table-card-title';

type SubmissionTableCardProps = { submission: ISubmissionDto };

export function SubmissionTableCard(
  props: SubmissionTableCardProps
): JSX.Element {
  const { submission } = props;
  const { files } = submission;

  let img: string | undefined;
  if (files.length) {
    img = `${getUrlSource()}/api/file/thumbnail/${files[0].id}`;
  }
  return (
    <EuiCard
      className="postybirb__submission-card"
      textAlign="left"
      image={img}
      title={<SubmissionTableCardTitle submission={submission} />}
      description={<div>test</div>}
    />
  );
}
