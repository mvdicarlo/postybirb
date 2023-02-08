import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { ITagConverter } from '@postybirb/types';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import TagConvertersApi from '../../../api/tag-converters.api';
import { TagConvertersKeybinding } from '../../../shared/app-keybindings';
import { ModalProperties } from '../../../shared/common-properties/modal.properties';
import { TagConverterStore } from '../../../stores/tag-converter-store';
import { useStore } from '../../../stores/use-store';
import Keybinding, { KeybindingProps } from '../../app/keybinding/keybinding';
import Loading from '../../shared/loading/loading';

type TagGroupsFlyoutProps = ModalProperties;

function createTagConverter() {
  return TagConvertersApi.create({
    tag: `Converter ${Date.now()}`,
    convertTo: {},
  });
}

function updateTagConverter(updatedTagConverter: ITagConverter) {
  const { id, tag, convertTo } = updatedTagConverter;
  return TagConvertersApi.update({ id, tag, convertTo });
}

function TagConverterField(props: { converter: ITagConverter }) {
  const { converter } = props;
  const [tagConverter, setTagConverter] = useState<ITagConverter>(converter);

  return (
    <EuiForm className="mb-2">
      <EuiFormRow
        fullWidth
        label={<FormattedMessage id="tag" defaultMessage="Tag" />}
      >
        <EuiFieldText
          value={converter.tag}
          onBlur={(event) => {
            setTagConverter({
              ...tagConverter,
              tag: event.target.value,
            });
          }}
        />
      </EuiFormRow>
      <EuiButtonIcon
        iconType="save"
        disabled={JSON.stringify(tagConverter) === JSON.stringify(converter)}
        onClick={() => {
          updateTagConverter(tagConverter);
        }}
      />
    </EuiForm>
  );
}

export function TagConvertersFlyout(props: TagGroupsFlyoutProps) {
  const { state, isLoading } = useStore(TagConverterStore);

  const { onClose, isOpen } = props;
  const keybindingProps: KeybindingProps = {
    keybinding: TagConvertersKeybinding,
    onActivate: () => {},
  };
  if (!isOpen) {
    return null;
  }

  return (
    <EuiFlyout ownFocus onClose={onClose} style={{ minWidth: '75vw' }}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <div>
            <Keybinding displayOnly {...keybindingProps}>
              <FormattedMessage
                id="tag-converters"
                defaultMessage="Tag Converters"
              />
            </Keybinding>
          </div>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Loading isLoading={isLoading}>
          <>
            <EuiButtonIcon
              iconType="plus"
              aria-label="Add new tag converter"
              onClick={createTagConverter}
            />
            <EuiSpacer />
            {state.map((converter) => (
              <TagConverterField converter={converter} />
            ))}
          </>
        </Loading>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
