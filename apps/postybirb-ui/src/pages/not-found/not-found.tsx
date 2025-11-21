import { Trans } from "@lingui/react/macro";
import { Box, Button, Flex, Space, Title } from '@mantine/core';
import { useNavigate } from 'react-router';

export default function NotFound() {
  const history = useNavigate();
  return (
    <Box>
      <Title order={1}>
        <Trans>Page not found</Trans>
      </Title>
      <Space h="md" />
      <Flex gap="lg">
        <Button onClick={() => history(-1)}>
          <Trans>Go back</Trans>
        </Button>
      </Flex>
    </Box>
  );
}
