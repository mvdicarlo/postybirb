import { EuiCard } from '@elastic/eui';
import { SubmissionDto } from '../../../../../../models/dtos/submission.dto';
import { getUrlSource } from '../../../../../../transports/https';
import { SubmissionTableCardTitle } from './submission-table-card-title';

type SubmissionCardOnSelect = (id: string) => void;

type SubmissionTableCardProps = {
  submission: SubmissionDto;
  onSelect: SubmissionCardOnSelect;
  selected: boolean;
};

export function SubmissionTableCard(
  props: SubmissionTableCardProps
): JSX.Element {
  const { submission, selected, onSelect } = props;
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
      selectable={{
        onClick: () => {
          onSelect(submission.id);
        },
        isSelected: selected,
        children: <span>{}</span>,
        iconType: selected ? 'stopFilled' : 'stop',
      }}
    />
  );
}
