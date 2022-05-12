import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';
import { IAccountDto, IWebsiteLoginInfo } from '@postybirb/dto';
import { ReactNode } from 'react';
import './account-login-modal.css';

type AccountLoginModalProps = {
  account: IAccountDto<unknown>;
  website: IWebsiteLoginInfo;
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
      <EuiModal
        initialFocus={initialFocus}
        maxWidth={false}
        className="w-screen h-screen"
        onClose={onClose}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>{website.displayName}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>{children}</EuiModalBody>
      </EuiModal>
    </EuiOverlayMask>
  );
}
