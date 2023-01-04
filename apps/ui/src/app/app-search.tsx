import {
  EuiSelectableTemplateSitewide,
  EuiSelectableTemplateSitewideOption,
} from '@elastic/eui';
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

  const dashboardOptions: EuiSelectableTemplateSitewideOption[] = [
    {
      key: 'home',
      label: 'Home',
      icon: {
        type: HomeIcon,
      },
      meta: [
        {
          text: 'Dashboard',
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
      label: 'Accounts',
      icon: {
        type: UserGroupIcon,
      },
      meta: [
        {
          text: 'Dashboard',
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
      label: 'File Submissions',
      icon: {
        type: FileIcon,
      },
      meta: [
        {
          text: 'Dashboard',
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
      label: 'Message Submissions',
      icon: {
        type: MessageIcon,
      },
      meta: [
        {
          text: 'Dashboard',
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
      label: 'Settings',
      icon: {
        type: GearIcon,
      },
      meta: [
        {
          text: 'Settings',
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
        label: s.getDefaultOptions().data.title || 'Unknown submission',
        icon: {
          type: isFileType ? FileIcon : MessageIcon,
        },
        meta: [
          {
            text: 'Submission',
            type: 'application',
          },
          {
            text: isFileType ? 'File' : 'Message',
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
          text: s.files[0].fileName,
          type: 'case',
        });
      }

      return sub;
    });
  return (
    <EuiSelectableTemplateSitewide
      options={[...dashboardOptions, ...submissionOptions]}
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
