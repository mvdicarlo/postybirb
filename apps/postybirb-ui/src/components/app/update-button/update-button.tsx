/* eslint-disable react/no-danger */
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { useState } from 'react';
import { useQuery } from 'react-query';
import updateApi from '../../../api/update.api';
import { ArrowUpIcon } from '../../shared/icons/Icons';
import './update-button.css';

export default function UpdateButton() {
  const [showNotes, setShowNotes] = useState(false);
  const { data } = useQuery(
    'update',
    () => updateApi.checkForUpdates().then((res) => res.body),
    {
      refetchInterval: 30_000,
    }
  );

  const { _ } = useLingui();

  const show = data?.updateAvailable ?? false;
  const patchNotes = data?.updateNotes ?? [];
  const disable = (data?.updateDownloaded || data?.updateDownloading) ?? false;
  return show ? (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
      <EuiFlexItem grow>
        <EuiButton
          size="s"
          color="success"
          aria-label={_(msg`Update PostyBirb`)}
          fullWidth
          iconType={ArrowUpIcon}
          disabled={disable}
          onClick={() => {
            updateApi.startUpdate();
          }}
        >
          <Trans comment="Update PostyBirb button on top of screen">
            Update
          </Trans>
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          anchorPosition="rightCenter"
          button={
            <EuiButtonIcon
              title={_(msg`Patch Notes`)}
              color="success"
              size="s"
              iconType="article"
              aria-label={_(msg`Information about the update`)}
              onClick={() => {
                setShowNotes(!showNotes);
              }}
            />
          }
          isOpen={showNotes}
          closePopover={() => setShowNotes(false)}
        >
          {patchNotes.map((note) => (
            <div>
              <EuiTitle size="xs">
                <h4>{note.version}</h4>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <div
                className="postybirb__update-button-css-override"
                dangerouslySetInnerHTML={{ __html: note.note ?? '' }}
              />
              {patchNotes.length > 1 ? <EuiHorizontalRule /> : null}
            </div>
          ))}
        </EuiPopover>
      </EuiFlexItem>
      {data?.updateProgress ? (
        <>
          <EuiFlexItem grow={false}>
            <EuiText>
              <p>{data.updateProgress || 0}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiProgress value={data.updateProgress || 0} max={100} size="xs" />
          </EuiFlexItem>
        </>
      ) : null}
    </EuiFlexGroup>
  ) : null;
}
