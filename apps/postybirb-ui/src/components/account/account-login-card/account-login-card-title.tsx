import { EuiButton, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import { DisplayableWebsiteLoginInfo } from '../../../models/displayable-website-login-info';

type AccountLoginCardTitleProps = {
  website: DisplayableWebsiteLoginInfo;
  onHide: (website: DisplayableWebsiteLoginInfo) => void;
  onAddClick: () => void;
};

export default function AccountLoginCardTitle(
  props: AccountLoginCardTitleProps
) {
  const { website, onHide, onAddClick } = props;
  const { displayName } = website;

  return (
    <div className="login-card-title">
      <span className="align-middle">{displayName}</span>
      <span>
        {website.isHidden ? (
          <EuiToolTip
            position="right"
            content={<FormattedMessage id="hide" defaultMessage="Hide" />}
          >
            <EuiButtonIcon
              className="ml-1"
              iconType="eye"
              aria-label={`Hide ${displayName}`}
              onClick={() => {
                onHide(website);
              }}
            />
          </EuiToolTip>
        ) : (
          <EuiToolTip
            position="right"
            content={<FormattedMessage id="show" defaultMessage="Show" />}
          >
            <EuiButtonIcon
              className="ml-1"
              iconType="eyeClosed"
              aria-label={`Unhide ${displayName}`}
              onClick={() => {
                onHide(website);
              }}
            />
          </EuiToolTip>
        )}
      </span>
      <span className="float-right">
        <EuiButton
          size="s"
          iconType="plus"
          aria-label={`Add account for ${displayName}`}
          onClick={onAddClick}
        >
          <FormattedMessage
            id="login.add-account"
            defaultMessage="Add account"
          />
        </EuiButton>
      </span>
    </div>
  );
}
