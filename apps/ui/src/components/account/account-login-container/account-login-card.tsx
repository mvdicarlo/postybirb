import { EuiButtonIcon, EuiCard } from '@elastic/eui';
import { DisplayableWebsiteLoginInfo } from '../../../models/displayable-website-login-info';

type AccountLoginCardProps = {
  website: DisplayableWebsiteLoginInfo;
  onHide: (website: DisplayableWebsiteLoginInfo) => void;
};

function LoginCardTitle(props: AccountLoginCardProps) {
  const { website, onHide } = props;
  const { displayName } = website;
  return (
    <div>
      <span>{displayName}</span>
      <span className="float-right">
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

export default function AccountLoginCard(
  props: AccountLoginCardProps
): JSX.Element {
  const { website } = props;
  return (
    <EuiCard
      textAlign="left"
      display="subdued"
      title={<LoginCardTitle {...props} />}
    >
      Hi
    </EuiCard>
  );
}
