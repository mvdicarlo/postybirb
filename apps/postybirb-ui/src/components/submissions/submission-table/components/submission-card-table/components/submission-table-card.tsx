import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiSplitPanel,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import websiteOptionsApi from '../../../../../../api/website-options.api';
import { SubmissionDto } from '../../../../../../models/dtos/submission.dto';

import { defaultTargetProvider } from '../../../../../../transports/http-client';
import {
  SquareCheckedIcon,
  SquareIcon,
} from '../../../../../shared/icons/Icons';
import SubmissionTableCardActions from './submission-table-card-actions';
import { SubmissionTableCardEditableFields } from './submission-table-card-editable-fields';

type SubmissionCardOnSelect = (id: string) => void;

type SubmissionTableCardProps = {
  submission: SubmissionDto;
  onSelect: SubmissionCardOnSelect;
  selected: boolean;
};

function SubmissionCardValidationStatus(props: {
  hasErrors: boolean;
  hasWarnings: boolean;
}) {
  const { hasErrors, hasWarnings } = props;
  if (hasErrors) {
    return (
      <EuiText color="danger" size="xs" className="text-center">
        <EuiIcon type="alert" color="danger" className="mr-1" />
        <FormattedMessage
          id="submission.card.errors"
          defaultMessage="Incomplete submission"
        />
      </EuiText>
    );
  }

  if (hasWarnings) {
    return (
      <EuiText color="warning" size="xs" className="text-center">
        <EuiIcon type="warning" color="warning" className="mr-1" />
        <FormattedMessage
          id="submission.card.warning"
          defaultMessage="Submission has warnings"
        />
      </EuiText>
    );
  }

  return null;
}

export function SubmissionTableCard(
  props: SubmissionTableCardProps
): JSX.Element {
  const { submission, selected, onSelect } = props;
  const { files } = submission;
  const { data: validationResult } = useQuery(
    `submission-validation-${submission.id}`,
    () =>
      websiteOptionsApi.validateSubmission(submission.id).then((res) => {
        let hasErrors = false;
        let hasWarnings = false;
        if (res.status === 200) {
          res.body.forEach((validation) => {
            if (validation.errors?.length) {
              hasErrors = true;
            }
            if (validation.warnings?.length) {
              hasWarnings = true;
            }
          });
        }
        return {
          hasErrors,
          hasWarnings,
        };
      })
  );

  const validationStatus = validationResult ?? {
    hasErrors: false,
    hasWarnings: false,
  };

  let img: string | undefined;
  if (files.length) {
    img = `${defaultTargetProvider()}/api/file/thumbnail/${files[0].id}`;
  }

  const canPost =
    !validationStatus.hasErrors &&
    submission.options.length > 1 &&
    submission.posts.length === 0;

  return (
    <EuiSplitPanel.Outer
      className="postybirb__submission-card"
      direction="row"
      style={{
        border: selected ? '1px solid rgb(54, 162, 239)' : undefined,
      }}
    >
      <EuiSplitPanel.Inner
        grow={false}
        color="subdued"
        className="postybirb__submission-card-selection-area"
        tabIndex={0}
        onClickCapture={() => {
          onSelect(submission.id);
        }}
        onKeyDownCapture={(event) => {
          if (event.code === 'Space' || event.code === 'Enter') {
            onSelect(submission.id);
          }
        }}
      >
        <EuiIcon type={selected ? SquareCheckedIcon : SquareIcon} />
      </EuiSplitPanel.Inner>

      <EuiSplitPanel.Inner paddingSize="none">
        <EuiFlexGroup justifyContent="flexStart" gutterSize="s">
          <EuiFlexItem grow={false}>
            {img ? (
              <EuiImage allowFullScreen alt="image" src={img} />
            ) : (
              <div style={{ display: 'none' }} />
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <SubmissionCardValidationStatus {...validationStatus} />
            <SubmissionTableCardEditableFields submission={submission} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>

      <EuiSplitPanel.Inner
        grow={false}
        className="postybirb__submission-card-actions"
      >
        <SubmissionTableCardActions submission={submission} canPost={canPost} />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}
