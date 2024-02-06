import {
  EuiSelectableTemplateSitewide,
  EuiSelectableTemplateSitewideOption,
} from '@elastic/eui';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { SubmissionType } from '@postybirb/types';
import { useNavigate } from 'react-router';
import {
  FileIcon,
  GearIcon,
  HomeIcon,
  MessageIcon,
  UserGroupIcon,
} from '../components/shared/icons/Icons';
import { useGlobalState } from '../global-state';
import {
  EditSubmissionPath,
  FileSubmissionPath,
  HomePath,
  MessageSubmissionPath,
} from '../pages/route-paths';
import { SubmissionStore } from '../stores/submission.store';
import { useStore } from '../stores/use-store';

export default function AppSearch() {
  const history = useNavigate();
  const [globalState, setGlobalState] = useGlobalState();
  const { state: submissions } = useStore(SubmissionStore);
  const { _ } = useLingui();

  const dashboardOptions: EuiSelectableTemplateSitewideOption[] = [
    {
      key: 'home',
      label: _(msg`Home`),
      icon: {
        type: HomeIcon,
      },
      meta: [
        {
          text: _(msg`Dashboard`),
          type: 'dashboard',
        },
      ],
      data: {
        navigate: () => {
          history(HomePath);
        },
      },
    },
    {
      key: 'accounts',
      label: _(msg`Accounts`),
      icon: {
        type: UserGroupIcon,
      },
      meta: [
        {
          text: _(msg`Dashboard`),
          type: 'dashboard',
        },
      ],
      data: {
        navigate: () => {
          setGlobalState({
            ...globalState,
            accountFlyoutVisible: true,
          });
        },
      },
    },
    {
      key: 'file-submissions',
      label: _(msg`File Submissions`),
      icon: {
        type: FileIcon,
      },
      meta: [
        {
          text: _(msg`Dashboard`),
          type: 'dashboard',
        },
      ],
      data: {
        navigate: () => {
          history(FileSubmissionPath);
        },
      },
    },
    {
      key: 'message-submissions',
      label: _(msg`Message Submissions`),
      icon: {
        type: MessageIcon,
      },
      meta: [
        {
          text: _(msg`Dashboard`),
          type: 'dashboard',
        },
      ],
      data: {
        navigate: () => {
          history(MessageSubmissionPath);
        },
      },
    },
    {
      key: 'settings',
      label: _(msg`Settings`),
      icon: {
        type: GearIcon,
      },
      meta: [
        {
          text: _(msg`Settings`),
          type: 'dashboard',
        },
      ],
      data: {
        navigate: () => {
          setGlobalState({
            ...globalState,
            settingsVisible: true,
          });
        },
      },
    },
  ];

  const submissionOptions: EuiSelectableTemplateSitewideOption[] =
    submissions.map((s) => {
      const isFileType = s.type === SubmissionType.FILE;
      const sub = {
        key: s.id,
        label: s.getDefaultOptions()?.data.title || _(msg`Unknown submission`),
        icon: {
          type: isFileType ? FileIcon : MessageIcon,
        },
        meta: [
          {
            text: _(msg`Submission`),
            type: 'application',
          },
          {
            text: isFileType ? _(msg`File`) : _(msg`Message`),
            type: 'deployment',
          },
        ],
        data: {
          navigate: () => {
            history(`${EditSubmissionPath}/${s.id}`);
          },
        },
      };

      if (isFileType) {
        sub.meta.push({
          text: s.files[0]?.fileName,
          type: 'case',
        });
      }

      return sub;
    });
  return (
    <EuiSelectableTemplateSitewide
      options={[...dashboardOptions, ...submissionOptions]}
      searchProps={{ placeholder: _(msg`Search for anything...`) }}
      onChange={(options) => {
        const opt = options.find((o) => o.checked === 'on');
        if (opt && opt.data) {
          // eslint-disable-next-line @typescript-eslint/dot-notation
          opt.data['navigate']();
        }
      }}
    />
  );
}
