import { EuiButton, EuiButtonIcon } from '@elastic/eui';
import { IAccountDto } from '@postybirb/dto';
import { FormattedMessage } from 'react-intl';
import { DisplayableWebsiteLoginInfo } from '../../../models/displayable-website-login-info';

type AccountLoginCardTitleProps = {
  website: DisplayableWebsiteLoginInfo;
  instances: IAccountDto[];
  onHide: (website: DisplayableWebsiteLoginInfo) => void;
  onAddClick: () => void;
};

export default function AccountLoginCardTitle(
  props: AccountLoginCardTitleProps
) {
  const { website, instances, onHide, onAddClick } = props;
  const { displayName } = website;

  return (
    <div className="login-card-title">
      <span className="align-middle">{displayName}</span>
      <span className="float-right">
        <EuiButton
          iconType="plus"
          aria-label={`Add account for ${displayName}`}
          onClick={onAddClick}
        >
          <FormattedMessage
            id="login.add-account"
            defaultMessage="Add account"
          />
        </EuiButton>
        {website.isHidden ? (
          <EuiButtonIcon
            iconType="eye"
            aria-label={`Hide ${displayName}`}
            onClick={() => {
              onHide(website);
            }}
          />
        ) : (
          <EuiButtonIcon
            iconType="eyeClosed"
            aria-label={`Unhide ${displayName}`}
            onClick={() => {
              onHide(website);
            }}
          />
        )}
      </span>
    </div>
  );
}
