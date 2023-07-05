import {
  EuiFocusTrap,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';
import { IAccountDto, IWebsiteInfoDto } from '@postybirb/types';
import { ReactNode } from 'react';
import './account-login-modal.css';

type AccountLoginModalProps = {
  account: IAccountDto<unknown>;
  website: IWebsiteInfoDto;
  // eslint-disable-next-line react/require-default-props
  initialFocus?: string;
  children: ReactNode;
  onClose: () => void;
};

export default function AccountLoginModal(props: AccountLoginModalProps) {
  const { children, account, website, initialFocus, onClose } = props;
  return (
    <EuiOverlayMask
      className="postybirb-login-modal-overlay"
      headerZindexLocation="above"
    >
      <EuiFocusTrap>
        <EuiModal
          initialFocus={initialFocus}
          maxWidth={false}
          className="postybirb-login-modal w-screen h-screen"
          onClose={onClose}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>{website.displayName}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>{children}</EuiModalBody>
        </EuiModal>
      </EuiFocusTrap>
    </EuiOverlayMask>
  );
}
