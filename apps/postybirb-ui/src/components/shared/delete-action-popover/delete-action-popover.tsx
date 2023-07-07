import {
  EuiButton,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import { KeyboardEvent, ReactNode, useCallback, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useToast } from '../../../app/app-toast-provider';
import { HttpResponse } from '../../../transports/http-client';

type DeleteActionPopoverProps = {
  onDelete: () => Promise<HttpResponse<{ success: boolean }>>;
  button: NonNullable<ReactNode>;
};

function onEnterKey(event: KeyboardEvent, cb: () => void) {
  if (event.key === 'Enter') {
    cb();
  }
}

export default function DeleteActionPopover(props: DeleteActionPopoverProps) {
  const { button, onDelete } = props;

  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openPopover = useCallback(() => setOpen(true), []);
  const remove = useCallback(() => {
    if (!isDeleting) {
      setIsDeleting(true);
      onDelete()
        .catch((err: HttpResponse<never>) => {
          addToast({
            id: Date.now().toString(),
            color: 'danger',
            iconType: 'error',
            text: <span>err.error.message</span>,
            title: (
              <div>
                <FormattedMessage
                  id="error.failed-to-delete"
                  defaultMessage="Failed to delete"
                />
                <span> - </span>
                <span>
                  {err.error.statusCode} - {err.error.error}
                </span>
              </div>
            ),
          });
        })
        .finally(() => {
          setIsDeleting(false);
        });
    }
  }, [addToast, isDeleting, onDelete]);

  return (
    <EuiPopover
      isOpen={open}
      closePopover={() => setOpen(false)}
      button={
        <span
          className="postybirb__delete_action_popover_wrapper"
          onClickCapture={openPopover}
          onKeyUpCapture={(event) => onEnterKey(event, openPopover)}
        >
          {button}
        </span>
      }
    >
      <EuiPopoverTitle>
        <FormattedMessage id="warning" defaultMessage="Warning" />
      </EuiPopoverTitle>
      <div>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="delete.warning-message"
              defaultMessage="This action cannot be undone"
            />
          </p>
        </EuiText>
      </div>
      <EuiPopoverFooter>
        <EuiButton
          fullWidth
          isDisabled={isDeleting}
          isLoading={isDeleting}
          size="s"
          onClick={onDelete}
          onKeyUp={(event: KeyboardEvent) => onEnterKey(event, remove)}
        >
          <FormattedMessage id="delete" defaultMessage="Delete" />
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
