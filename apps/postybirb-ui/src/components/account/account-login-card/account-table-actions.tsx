import {
  EuiButton,
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import accountApi from '../../../api/account.api';
import { useToast } from '../../../app/app-toast-provider';
import DeleteActionPopover from '../../shared/delete-action-popover/delete-action-popover';

export function DeleteAccountPopover(props: { id: string }) {
  const { id } = props;

  return (
    <EuiToolTip
      content={<FormattedMessage id="delete" defaultMessage="Delete" />}
    >
      <DeleteActionPopover
        onDelete={() => accountApi.remove([id])}
        successMessage={
          <FormattedMessage
            id="login.account-removed"
            defaultMessage="Account removed"
          />
        }
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

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setOpen(false)}
      button={
        <EuiToolTip
          content={
            <FormattedMessage
              id="login.clear-data"
              defaultMessage="Clear account data"
            />
          }
        >
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
            <FormattedMessage
              id="action.cannot-be-undone"
              defaultMessage="This action cannot be undone."
            />
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
                  text: (
                    <FormattedMessage
                      id="login.account-data-cleared"
                      defaultMessage="Account data cleared"
                    />
                  ),
                });
              })
              .catch((res) => {
                addErrorToast(res);
              });
          }}
        >
          <FormattedMessage id="login.clear-data" defaultMessage="Clear data" />
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
