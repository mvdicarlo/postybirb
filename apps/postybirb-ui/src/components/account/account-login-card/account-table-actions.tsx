import {
  EuiButton,
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { useState } from 'react';
import { Trans } from '@lingui/macro';
import accountApi from '../../../api/account.api';
import { useToast } from '../../../app/app-toast-provider';
import DeleteActionPopover from '../../shared/delete-action-popover/delete-action-popover';

export function DeleteAccountPopover(props: { id: string }) {
  const { id } = props;

  return (
    <EuiToolTip content={<Trans comment="Delete account">Delete</Trans>}>
      <DeleteActionPopover
        onDelete={() => accountApi.remove([id])}
        successMessage={<Trans>Account removed</Trans>}
      >
        <EuiButtonIcon
          aria-label="Delete"
          className="ml-1"
          iconType="trash"
          color="danger"
        />
      </DeleteActionPopover>
    </EuiToolTip>
  );
}

export function ClearAccountDataPopover(props: { id: string }) {
  const { id } = props;
  const [isOpen, setOpen] = useState<boolean>(false);
  const { addToast, addErrorToast } = useToast();

  const clearAccountDataLabel = <Trans>Clear account data</Trans>;

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setOpen(false)}
      button={
        <EuiToolTip content={clearAccountDataLabel}>
          <EuiButtonIcon
            aria-label="Clear account data"
            iconType="flag"
            color="warning"
            onClick={() => setOpen(true)}
          />
        </EuiToolTip>
      }
    >
      <div style={{ width: '300px' }}>
        <EuiText size="s">
          <p>
            <Trans>This action cannot be undone.</Trans>
          </p>
        </EuiText>
      </div>
      <EuiPopoverFooter>
        <EuiButton
          fullWidth
          color="warning"
          iconType="flag"
          onClick={() => {
            setOpen(false);
            accountApi
              .clear(id)
              .then(() => {
                addToast({
                  id,
                  color: 'success',
                  text: <Trans>Account data cleared</Trans>,
                });
              })
              .catch((res) => {
                addErrorToast(res);
              });
          }}
        >
          {clearAccountDataLabel}
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
