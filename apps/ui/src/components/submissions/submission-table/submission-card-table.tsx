import {
  EuiCard,
  EuiDatePicker,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { ISubmissionDto } from '@postybirb/dto';
import { BaseWebsiteOptions, ISubmissionOptions } from '@postybirb/types';
import { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import SubmissionOptionsApi from '../../../api/submission-options.api';
import { getUrlSource } from '../../../transports/https';

type SubmissionCardTableProps = {
  submissions: ISubmissionDto[];
};

type TableCardProps = { submission: ISubmissionDto };

function getDefaultOptions<T extends BaseWebsiteOptions>(
  submission: ISubmissionDto
): ISubmissionOptions<T> {
  return submission.options.find((o) => !o.account) as ISubmissionOptions<T>;
}

function TableCard(props: TableCardProps): JSX.Element {
  const { submission } = props;
  const { files } = submission;
  const { id, data: defaultOptions } = getDefaultOptions(submission);

  const submitChanges = useCallback(
    (options: BaseWebsiteOptions) => {
      if (JSON.stringify(options) !== JSON.stringify(defaultOptions)) {
        SubmissionOptionsApi.update({ id, data: options });
      }
    },
    [id, defaultOptions]
  );

  let img: string | undefined;
  if (files.length) {
    img = `${getUrlSource()}/api/file/thumbnail/${files[0].id}`;
  }
  return (
    <EuiCard
      className="postybirb__submission-card"
      textAlign="left"
      image={img}
      title={
        <div>
          <EuiFieldText
            compressed
            fullWidth
            prepend={
              // eslint-disable-next-line jsx-a11y/label-has-associated-control
              <label className="euiFormLabel euiFormControlLayout__prepend">
                <FormattedMessage id="default.name" defaultMessage="Name" />
              </label>
            }
            isInvalid={!defaultOptions.title?.length}
            defaultValue={defaultOptions.title || ''}
            onBlur={(event) => {
              submitChanges({
                ...defaultOptions,
                title: event.target.value.trim(),
              });
            }}
          />
          <EuiSpacer size="xs" />
          <EuiDatePicker
            className="euiFormControlLayout--compressed"
            showTimeSelect
          />
        </div>
      }
      description={<div>test</div>}
    />
  );
}

export function SubmissionCardTable({
  submissions,
}: SubmissionCardTableProps): JSX.Element {
  const cards = useMemo(
    () =>
      submissions.map((s) => (
        <EuiFlexItem
          className="postybirb__submission-card-item"
          grow={false}
          key={s.id}
        >
          <TableCard submission={s} />
        </EuiFlexItem>
      )),
    [submissions]
  );
  return (
    <div className="postybirb__submission-card-table">
      <EuiFlexGroup gutterSize="l" wrap>
        {cards}
      </EuiFlexGroup>
    </div>
  );
}
