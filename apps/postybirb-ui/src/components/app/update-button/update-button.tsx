import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import updateApi from '../../../api/update.api';
import { ArrowUpIcon } from '../../shared/icons/Icons';

export default function UpdateButton() {
  const { data } = useQuery(
    'update',
    () => updateApi.checkForUpdates().then((res) => res.body),
    {
      refetchInterval: 60_000,
    }
  );

  const show = data?.updateAvailable;
  const patchNotes = data?.updateNotes;
  console.log(patchNotes);
  return show ? (
    <EuiButton
      color="success"
      aria-label="Update PostyBirb"
      fullWidth
      iconType={ArrowUpIcon}
    >
      <FormattedMessage id="update" defaultMessage="Update" />
    </EuiButton>
  ) : null;
}
