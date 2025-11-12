import { Plural, Trans } from "@lingui/react/macro";
import { Box, DefaultMantineColor, Loader, Popover, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { E621TagCategory, TagSearchProviderSettings } from '@postybirb/types';
import { useCallback, useRef } from 'react';
import { useAsync } from 'react-use';
import { TagSearchProvider } from '../../components/form/fields/tag-search/tag-search-provider';
import { E621Dtext } from './e621-dtext-renderer';

const headers = new Headers({
  // eslint-disable-next-line lingui/no-unlocalized-strings
  'User-Agent': `PostyBirb/${window.electron?.app_version ?? '0.0.0'}`,
});

async function e621Get<T>(url: string): Promise<T> {
  return (await (await fetch(url, { headers })).json()) as T;
}

interface E621AutocompleteTag {
  name: string;
  post_count: number;
  category: E621TagCategory;
}

// From https://e621.net/help/tags#top
const colors: Record<E621TagCategory, undefined | DefaultMantineColor> = {
  [E621TagCategory.Artist]: 'orange',
  [E621TagCategory.Character]: 'green',
  [E621TagCategory.Copyright]: 'grape',
  [E621TagCategory.Species]: 'yellow',
  [E621TagCategory.General]: undefined,
  [E621TagCategory.Meta]: undefined,
  [E621TagCategory.Invalid]: 'red',
  [E621TagCategory.Contributor]: 'silver',
  [E621TagCategory.Lore]: 'green',
};

class E621TagSearchProvider extends TagSearchProvider {
  private tags = new Map<string, E621AutocompleteTag>();

  protected async searchImplementation(query: string): Promise<string[]> {
    if (query.length < 3) return []; // e621 does not supports query with less then 3 characters

    const url = `https://e621.net/tags/autocomplete.json?expiry=7&search[name_matches]=${encodeURIComponent(query)}`;
    const tags = await e621Get<E621AutocompleteTag[]>(url);

    for (const tag of tags) this.tags.set(tag.name, tag);

    return tags.map((e) => e.name);
  }

  renderSearchItem(
    tagName: string,
    settings: TagSearchProviderSettings,
  ): React.ReactNode {
    const tag = this.tags.get(tagName);
    if (!tag) return undefined;

    return <E621TagSearchItem tag={tag} settings={settings} />;
  }
}

interface E621WikiPage {
  body: string;
}

const wikiPagesCache = new Map<string, E621WikiPage>();

function E621TagSearchItem(props: {
  tag: E621AutocompleteTag;
  settings: TagSearchProviderSettings;
}) {
  const [openedTag, tagController] = useDisclosure(false);
  const [openedDropdown, dropdownController] = useDisclosure(false);
  const { tag, settings } = props;
  const opened = openedDropdown || openedTag;

  const wikiPage = useAsync(async () => {
    if (!settings.showWikiInHelpOnHover) return undefined;

    const cache = wikiPagesCache.get(tag.name);
    if (cache) return cache;

    if (!opened) return undefined;

    const url = `https://e621.net/wiki_pages.json?search[title]=${encodeURIComponent(tag.name)}`;
    const pages = await e621Get<E621WikiPage[]>(url);
    if (!pages.length) return undefined;

    const page = pages[0];
    wikiPagesCache.set(tag.name, page);
    return page;
  }, [opened, tag.name]);

  const textMouseLeaveTimeout = useRef<number | NodeJS.Timeout>();
  const onTextMouseLeave = useCallback(() => {
    clearTimeout(textMouseLeaveTimeout.current);
    textMouseLeaveTimeout.current = setTimeout(tagController.close, 300);
  }, [tagController]);

  return (
    <Popover width={600} position="left" shadow="md" opened={opened}>
      <Popover.Target>
        <Text
          inherit
          c={colors[tag.category]}
          onMouseEnter={tagController.open}
          onMouseLeave={onTextMouseLeave}
        >
          {tag.name} ({tag.post_count})
        </Text>
      </Popover.Target>
      <Popover.Dropdown>
        <Box
          onMouseEnter={dropdownController.open}
          onMouseLeave={dropdownController.close}
          onClick={(event) => event.stopPropagation()}
        >
          <Text size="sm">
            <strong>
              <Plural
                value={tag.post_count}
                one="Post count"
                other="Posts count"
              />
            </strong>
            : {tag.post_count}
          </Text>
          <Text size="sm">
            <strong>
              <Trans>Category</Trans>
            </strong>
            : {E621TagCategory[tag.category]}
          </Text>
          {settings.showWikiInHelpOnHover && (
            <Text size="sm">
              <strong>
                <Trans>Description</Trans>
              </strong>
              :{' '}
              {wikiPage.loading ? (
                <Loader width={10} />
              ) : (
                <E621Dtext dtext={wikiPage.value?.body ?? ''} />
              )}
            </Text>
          )}
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}

export const e621TagSearchProvider = new E621TagSearchProvider();
