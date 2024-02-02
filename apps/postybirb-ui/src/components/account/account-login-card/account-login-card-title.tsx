import { EuiButton, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useMemo } from 'react';
import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
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

  const displayIcon = useMemo(
    () =>
      website.isHidden ? (
        <EuiToolTip position="right" content={<Trans>Hide</Trans>}>
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
        <EuiToolTip position="right" content={<Trans>Show</Trans>}>
          <EuiButtonIcon
            className="ml-1"
            iconType="eyeClosed"
            aria-label={`Unhide ${displayName}`}
            onClick={() => {
              onHide(website);
            }}
          />
        </EuiToolTip>
      ),
    [displayName, onHide, website]
  );

  const { _ } = useLingui();

  return (
    <span className="login-card-title">
      <span className="align-middle">{displayName}</span>
      <span>{displayIcon}</span>
      <span className="float-right">
        <EuiButton
          size="s"
          iconType="plus"
          aria-label={_(msg`Add account for ${displayName}`)}
          onClick={onAddClick}
        >
          <Trans>Add account</Trans>
        </EuiButton>
      </span>
    </span>
  );
}
