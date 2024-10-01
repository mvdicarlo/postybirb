import { Trans } from '@lingui/macro';
import { Box } from '@mantine/core';
import { IconHome } from '@tabler/icons-react';
import { PageHeader } from '../../components/page-header/page-header';

export default function HomePage() {
  return (
    <>
      <PageHeader icon={<IconHome />} title={<Trans>Home</Trans>} />
      <Box>
        <Trans>Home Page</Trans>
      </Box>
    </>
  );
}
