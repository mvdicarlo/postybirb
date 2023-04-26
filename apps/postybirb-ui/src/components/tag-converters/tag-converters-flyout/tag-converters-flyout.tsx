import {
  EuiButton,
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
import { IWebsiteInfoDto } from '@postybirb/dto';
import { ITagConverter } from '@postybirb/types';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import TagConvertersApi from '../../../api/tag-converters.api';
import WebsitesApi from '../../../api/websites.api';
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

function TagConverterField(props: {
  converter: ITagConverter;
  websiteInfo: IWebsiteInfoDto[];
}) {
  const { converter, websiteInfo } = props;
  const [tagConverter, setTagConverter] = useState<ITagConverter>(converter);

  return (
    <EuiForm className="mb-2">
      <EuiFormRow
        fullWidth
        label={<FormattedMessage id="tag" defaultMessage="Tag" />}
      >
        <EuiFieldText
          compressed
          value={tagConverter.tag}
          onChange={(event) => {
            setTagConverter({
              ...tagConverter,
              tag: event.target.value,
            });
          }}
          onBlur={(event) => {
            setTagConverter({
              ...tagConverter,
              tag: event.target.value.trim(),
            });
          }}
        />
      </EuiFormRow>
      {websiteInfo.map((website) => (
        <EuiFormRow fullWidth label={website.displayName}>
          <EuiFieldText
            compressed
            value={tagConverter.convertTo[website.id] ?? ''}
            onChange={(event) => {
              setTagConverter({
                ...tagConverter,
                convertTo: {
                  ...tagConverter.convertTo,
                  [website.id]: event.target.value,
                },
              });
            }}
            onBlur={(event) => {
              setTagConverter({
                ...tagConverter,
                convertTo: {
                  ...tagConverter.convertTo,
                  [website.id]: event.target.value.trim(),
                },
              });
            }}
          />
        </EuiFormRow>
      ))}
      <div>
        <EuiSpacer size="s" />
        <EuiButtonIcon
          size="m"
          className="mr-1"
          aria-label={`Save tag converter ${tagConverter.tag}`}
          iconType="save"
          disabled={JSON.stringify(tagConverter) === JSON.stringify(converter)}
          onClick={() => {
            updateTagConverter(tagConverter);
          }}
        />
        <EuiButtonIcon
          size="m"
          aria-label={`Delete tag converter ${tagConverter.tag}`}
          iconType="trash"
          color="danger"
          onClick={() => {
            TagConvertersApi.remove([tagConverter.id]);
          }}
        />
      </div>
    </EuiForm>
  );
}

export function TagConvertersFlyout(props: TagGroupsFlyoutProps) {
  const { state, isLoading } = useStore(TagConverterStore);
  const { data: websiteInfo, isLoading: isLoadingWebsiteInfo } = useQuery(
    'website-info',
    WebsitesApi.getWebsiteInfo,
    {
      refetchInterval: false,
      refetchOnWindowFocus: false,
    }
  );

  const { onClose, isOpen } = props;
  const keybindingProps: KeybindingProps = {
    keybinding: TagConvertersKeybinding,
    onActivate: () => {},
  };
  if (!isOpen) {
    return null;
  }

  const sortedWebsiteInfo = (websiteInfo ?? [])
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .filter((website) => website.metadata.supportsTags !== false);

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
        <Loading isLoading={isLoading || isLoadingWebsiteInfo}>
          <>
            <EuiButton
              iconType="plus"
              aria-label="Add new tag converter"
              onClick={createTagConverter}
              size="s"
            >
              <FormattedMessage id="add" defaultMessage="Add" />
            </EuiButton>
            {state.map((converter) => (
              <>
                <EuiSpacer />
                <TagConverterField
                  converter={converter}
                  websiteInfo={sortedWebsiteInfo}
                />
              </>
            ))}
          </>
        </Loading>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
