import { EuiButton, EuiPopover, EuiPopoverFooter, EuiText } from '@elastic/eui';
import { KeyboardEvent, PropsWithChildren, useCallback, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useToast } from '../../../app/app-toast-provider';
import { HttpResponse } from '../../../transports/http-client';

type DeleteActionPopoverProps = {
  onDelete: () => Promise<HttpResponse<{ success: boolean }>>;
  // eslint-disable-next-line react/require-default-props
  successMessage?: NonNullable<JSX.Element>;
};

function onEnterKey(event: KeyboardEvent, cb: () => void) {
  if (event.key === 'Enter') {
    cb();
  }
}

export default function DeleteActionPopover(
  props: PropsWithChildren<DeleteActionPopoverProps>
) {
  const { children, successMessage, onDelete } = props;

  const { addToast, addErrorToast } = useToast();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openPopover = useCallback(() => setOpen(true), []);
  const remove = useCallback(() => {
    if (!isDeleting) {
      setIsDeleting(true);
      onDelete()
        .then(() => {
          if (successMessage) {
            addToast({
              id: Date.now().toString(),
              color: 'success',
              text: successMessage,
            });
          }
        })
        .catch((err: HttpResponse<never>) => {
          addErrorToast(err);
        })
        .finally(() => {
          setIsDeleting(false);
        });
    }
  }, [addToast, addErrorToast, isDeleting, onDelete, successMessage]);

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
          {children}
        </span>
      }
    >
      <div>
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
