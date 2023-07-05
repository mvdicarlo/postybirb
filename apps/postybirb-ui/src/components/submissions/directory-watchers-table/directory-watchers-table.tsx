import {
  EuiButton,
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import {
  DirectoryWatcherImportAction,
  IDirectoryWatcher,
  SubmissionType,
} from '@postybirb/types';
import { useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import directoryWatchersApi from '../../../api/directory-watchers.api';
import { SaveIcon } from '../../shared/icons/Icons';
import SubmissionPicker from '../submission-picker.ts/submission-picker';

type DirectoryWatcherCardProps = {
  directoryWatcher: IDirectoryWatcher;
  refetch: () => void;
};

function hasChanged(
  original: IDirectoryWatcher,
  updated: IDirectoryWatcher
): boolean {
  if (
    original.path !== updated.path ||
    original.importAction !== updated.importAction ||
    original.template !== updated.template ||
    JSON.stringify(original.submissionIds ?? []) !==
      JSON.stringify(updated.submissionIds ?? [])
  ) {
    return true;
  }

  return false;
}

function DirectoryWatcherCard(props: DirectoryWatcherCardProps) {
  const { directoryWatcher, refetch } = props;
  const [state, setState] = useState({ ...directoryWatcher });

  const options = [
    {
      label: 'Create new submission',
      value: DirectoryWatcherImportAction.NEW_SUBMISSION,
    },
    {
      label: 'Add to submission',
      value: DirectoryWatcherImportAction.ADD_TO_SUBMISSION,
    },
  ];

  return (
    <EuiPanel grow={false} className="postybirb-plus__directory-watcher-panel">
      <EuiForm>
        <EuiFormRow
          label={<FormattedMessage id="action" defaultMessage="Action" />}
        >
          <EuiComboBox
            compressed
            singleSelection={{ asPlainText: true }}
            isClearable={false}
            aria-label="Folder watcher type"
            options={options}
            selectedOptions={[
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              options.find((o) => o.value === state.importAction)!,
            ]}
            renderOption={(option) => {
              switch (option.value) {
                case DirectoryWatcherImportAction.NEW_SUBMISSION:
                  return (
                    <FormattedMessage
                      id="directory-watcher.import-action.new-submission"
                      defaultMessage="Create new submission"
                    />
                  );
                case DirectoryWatcherImportAction.ADD_TO_SUBMISSION:
                  return (
                    <FormattedMessage
                      id="directory-watcher.import-action.add-to-submission"
                      defaultMessage="Add to submission"
                    />
                  );
                default:
                  return option.label;
              }
            }}
            onChange={(change) => {
              setState({
                ...state,
                importAction: change[0].value as DirectoryWatcherImportAction,
              });
            }}
          />
        </EuiFormRow>

        <EuiFormRow
          label={<FormattedMessage id="folder" defaultMessage="Folder" />}
        >
          <EuiButton
            iconType="folderOpen"
            disabled={!window.electron.pickDirectory}
            onClick={() => {
              if (window.electron.pickDirectory) {
                window.electron.pickDirectory().then((path) => {
                  setState({ ...state, path: path ?? state.path });
                });
              }
            }}
          >
            {state.path || 'Empty'}
          </EuiButton>
        </EuiFormRow>
        {state.importAction ===
        DirectoryWatcherImportAction.ADD_TO_SUBMISSION ? (
          <EuiFormRow
            label={
              <FormattedMessage id="submissions" defaultMessage="Submissions" />
            }
          >
            <SubmissionPicker
              type={SubmissionType.FILE}
              selected={state.submissionIds ?? []}
              onChange={(submissions) => {
                setState({
                  ...state,
                  submissionIds: submissions.map((s) => s.id),
                });
              }}
            />
          </EuiFormRow>
        ) : null}
      </EuiForm>
      <EuiHorizontalRule />
      <EuiFlexGroup alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            aria-label="Delete folder watcher"
            onClick={() => {
              directoryWatchersApi.remove([directoryWatcher.id]).finally(() => {
                refetch();
              });
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            disabled={!hasChanged(directoryWatcher, state)}
            iconType={SaveIcon}
            color="primary"
            aria-label="Save folder upload changes"
            onClick={() => {
              directoryWatchersApi
                .update(directoryWatcher.id, {
                  ...state,
                })
                .finally(() => {
                  refetch();
                });
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export default function DirectoryWatchersTable() {
  const { data, isLoading, refetch } = useQuery(
    [`directory-watchers`],
    () => directoryWatchersApi.getAll().then((res) => res.body),
    {
      refetchOnWindowFocus: false,
      cacheTime: 0,
    }
  );

  const watcherCards = useMemo(
    () =>
      (data || []).map((watcher) => (
        <EuiFlexItem grow={false}>
          <DirectoryWatcherCard
            key={watcher.id}
            directoryWatcher={watcher}
            refetch={refetch}
          />
        </EuiFlexItem>
      )),
    [data, refetch]
  );

  return (
    <div className="postybirb-plus__directory-watchers-container">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="directory-watcher.header"
            defaultMessage="Upload from folders"
          />
          <EuiButtonIcon
            iconType="plus"
            className="ml-2"
            onClick={() => {
              directoryWatchersApi
                .create({
                  importAction: DirectoryWatcherImportAction.NEW_SUBMISSION,
                })
                .finally(() => {
                  refetch();
                });
            }}
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {isLoading || !data ? (
        <EuiLoadingSpinner />
      ) : (
        <EuiFlexGroup wrap>{watcherCards}</EuiFlexGroup>
      )}
    </div>
  );
}
