import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { Loader, MultiSelect } from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { useWebsites } from '../../../../hooks/account/use-websites';

export function WebsiteVisibilityPicker() {
  const { websites, isLoading, filteredWebsites, setHiddenWebsites } =
    useWebsites();
  const { _ } = useLingui();

  if (isLoading) {
    return <Loader />;
  }

  return (
    <MultiSelect
      leftSection={<IconEye />}
      label={<Trans>Websites</Trans>}
      value={filteredWebsites.map((website) => website.id)}
      data={websites.map((website) => ({
        value: website.id,
        label: website.displayName,
      }))}
      placeholder={_(msg`Choose websites`)}
      onChange={(values) => {
        // perform a compliment set operation to get the hidden websites
        const hiddenWebsites = websites
          .map((website) => website.id)
          .filter((websiteId) => !values.includes(websiteId));
        setHiddenWebsites(hiddenWebsites);
      }}
    />
  );
}
