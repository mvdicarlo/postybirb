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
import AccountApi from '../../../api/account.api';
import { useToast } from '../../../app/app-toast-provider';
import HttpErrorResponse from '../../../models/http-error-response';

export function DeleteAccountPopover(props: { id: string }) {
  const { id } = props;
  const [isOpen, setOpen] = useState<boolean>(false);
  const { addToast } = useToast();

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setOpen(false)}
      button={
        <EuiToolTip
          content={<FormattedMessage id="delete" defaultMessage="Delete" />}
        >
          <EuiButtonIcon
            aria-label="Delete"
            className="ml-1"
            iconType="trash"
            color="danger"
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
          color="danger"
          iconType="trash"
          onClick={() => {
            setOpen(false);
            AccountApi.remove(id)
              .then(() => {
                addToast({
                  id,
                  color: 'success',
                  text: (
                    <FormattedMessage
                      id="login.account-removed"
                      defaultMessage="Account removed"
                    />
                  ),
                });
              })
              .catch(({ error }: { error: HttpErrorResponse }) => {
                addToast({
                  id,
                  text: <span>{error.message}</span>,
                  title: (
                    <span>
                      {error.statusCode} {error.error}
                    </span>
                  ),
                  color: 'danger',
                });
              });
          }}
        >
          <FormattedMessage id="delete" defaultMessage="Delete" />
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}

export function ClearAccountDataPopover(props: { id: string }) {
  const { id } = props;
  const [isOpen, setOpen] = useState<boolean>(false);
  const { addToast } = useToast();

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
            AccountApi.clear(id)
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
              .catch(({ error }: { error: HttpErrorResponse }) => {
                addToast({
                  id,
                  text: <span>{error.message}</span>,
                  title: (
                    <span>
                      {error.statusCode} {error.error}
                    </span>
                  ),
                  color: 'danger',
                });
              });
          }}
        >
          <FormattedMessage id="login.clear-data" defaultMessage="Clear data" />
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
