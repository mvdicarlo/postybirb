import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { Trans } from '@lingui/macro';
import { useDrawerToggle } from '../../../app/postybirb-layout/drawers/use-drawer-toggle';
import { TagGroupsKeybinding } from '../../../shared/app-keybindings';
import { TagGroupStore } from '../../../stores/tag-group-store';
import { useStore } from '../../../stores/use-store';
import Keybinding, { KeybindingProps } from '../../app/keybinding/keybinding';
import Loading from '../../shared/loading/loading';
import TagGroupsTable from '../tag-groups-table/tag-groups-table';

export function TagGroupsFlyout() {
  const [isOpen, toggle] = useDrawerToggle('tagGroupsFlyoutVisible');
  const { state, isLoading } = useStore(TagGroupStore);

  const keybindingProps: KeybindingProps = {
    keybinding: TagGroupsKeybinding,
    onActivate: () => {},
  };
  if (!isOpen) {
    return null;
  }

  return (
    <EuiFlyout
      ownFocus
      onClose={() => {
        toggle(false);
      }}
      style={{ minWidth: '75vw' }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <div>
            <Keybinding displayOnly {...keybindingProps}>
              <Trans>Tag Groups</Trans>
            </Keybinding>
          </div>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Loading isLoading={isLoading}>
          <TagGroupsTable tagGroups={state} />
        </Loading>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
