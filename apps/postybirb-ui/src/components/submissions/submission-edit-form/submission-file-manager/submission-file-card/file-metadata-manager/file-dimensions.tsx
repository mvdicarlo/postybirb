import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Box,
  Card,
  Collapse,
  Grid,
  Group,
  NumberInput,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  AccountId,
  FileMetadataFields,
  IAccount,
  ISubmissionFileDto,
  IWebsiteInfoDto,
  ModifiedFileDimension,
} from '@postybirb/types';
import {
  IconChevronDown,
  IconChevronRight,
  IconInfoCircle,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useWebsites } from '../../../../../../hooks/account/use-websites';

type FileDetailProps = {
  file: ISubmissionFileDto;
  metadata: FileMetadataFields;
  accounts: IAccount[];
  save: () => void;
};

function updateFileDimensions(
  metadata: FileMetadataFields,
  file: ISubmissionFileDto,
  height: number,
  width: number,
) {
  // eslint-disable-next-line no-param-reassign
  metadata.dimensions.default = {
    fileId: file.id,
    height,
    width,
  };
}

function calculateAspectRatio(
  height: number,
  width: number,
  aspect: number,
  order: 'h' | 'w',
) {
  if (order === 'h') {
    const aspectRatio = aspect; // width / height

    const widthT = Math.ceil(height * aspectRatio);
    const heightT = Math.ceil(height);

    return { width: widthT, height: heightT };
  }

  const aspectRatio = aspect; // height / width

  const heightT = Math.ceil(width * aspectRatio);
  const widthT = Math.ceil(width);

  return { width: widthT, height: heightT };
}

// Helper functions for per-account dimensions
function updateAccountDimensions(
  metadata: FileMetadataFields,
  file: ISubmissionFileDto,
  accountId: AccountId,
  height: number,
  width: number,
) {
  if (!metadata.dimensions) {
    // eslint-disable-next-line no-param-reassign
    metadata.dimensions = {};
  }
  // eslint-disable-next-line no-param-reassign
  metadata.dimensions[accountId] = {
    fileId: file.id,
    height,
    width,
  };
}

function removeAccountDimensions(
  metadata: FileMetadataFields,
  accountId: AccountId,
) {
  if (metadata.dimensions) {
    // eslint-disable-next-line no-param-reassign
    delete metadata.dimensions[accountId];
  }
}

function getAccountDimensions(
  metadata: FileMetadataFields,
  accountId: AccountId,
  file: ISubmissionFileDto,
): ModifiedFileDimension {
  return metadata.dimensions[accountId] ?? metadata.dimensions.default ?? file;
}

export function FileDimensions(props: FileDetailProps) {
  const { websites } = useWebsites();
  const { accounts, file, metadata, save } = props;

  const accountGroups: Record<
    string,
    {
      accounts: IAccount[];
      website: IWebsiteInfoDto;
    }
  > = {};
  accounts.forEach((account) => {
    const website = websites.find((w) => w.id === account.website);
    if (website) {
      if (!accountGroups[website.id]) {
        accountGroups[website.id] = { accounts: [], website };
      }
      accountGroups[website.id].accounts.push(account);
    }
  });

  const { width: providedWidth, height: providedHeight } =
    metadata.dimensions.default ?? file;

  const [height, setHeight] = useState<number>(providedHeight || 1);
  const [width, setWidth] = useState<number>(providedWidth || 1);

  // State for all account dimensions
  const [accountDimensions, setAccountDimensions] = useState<
    Record<AccountId, { height: number; width: number }>
  >(() => {
    const initial: Record<AccountId, { height: number; width: number }> = {};
    accounts.forEach((account) => {
      const dims = getAccountDimensions(metadata, account.id, file);
      initial[account.id] = {
        height: dims.height || 1,
        width: dims.width || 1,
      };
    });
    return initial;
  });

  // State for collapsible website cards
  const [collapsedWebsites, setCollapsedWebsites] = useState<
    Record<string, boolean>
  >({});

  const updateAccountDimensionState = (
    accountId: AccountId,
    newHeight: number,
    newWidth: number,
  ) => {
    setAccountDimensions((prev) => ({
      ...prev,
      [accountId]: { height: newHeight, width: newWidth },
    }));
  };

  const toggleWebsiteCollapse = (websiteId: string) => {
    setCollapsedWebsites((prev) => ({
      ...prev,
      [websiteId]: !prev[websiteId],
    }));
  };

  return (
    <Box pt="xs">
      {/* Default Dimensions */}
      <Group gap="xs" mb={5}>
        <Text size="sm" fw={600}>
          <Trans>Dimensions</Trans>
        </Text>
        <Tooltip
          label={
            <Trans>Adjust dimensions while maintaining aspect ratio</Trans>
          }
          withArrow
        >
          <IconInfoCircle size={14} style={{ opacity: 0.7 }} />
        </Tooltip>
      </Group>
      <Grid>
        <Grid.Col span={6}>
          <NumberInput
            label={<Trans>Height</Trans>}
            value={height}
            max={file.height}
            min={1}
            size="xs"
            step={10}
            onBlur={(event) => {
              const { width: aspectW, height: aspectH } = calculateAspectRatio(
                Math.min(Number(event.target.value), file.height),
                width,
                file.width / file.height,
                'h',
              );
              setHeight(aspectH);
              setWidth(aspectW);
              updateFileDimensions(metadata, file, aspectH, aspectW);
              save();
            }}
            onChange={(value) => setHeight(Number(value) || 1)}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label={<Trans>Width</Trans>}
            value={width}
            max={file.width}
            min={1}
            size="xs"
            step={10}
            onBlur={(event) => {
              const { width: aspectW, height: aspectH } = calculateAspectRatio(
                height,
                Math.min(Number(event.target.value), file.width),
                file.height / file.width,
                'w',
              );
              setHeight(aspectH);
              setWidth(aspectW);
              updateFileDimensions(metadata, file, aspectH, aspectW);
              save();
            }}
            onChange={(value) => setWidth(Number(value) || 1)}
          />
        </Grid.Col>
      </Grid>

      {/* Custom Dimensions per Account */}
      {Object.keys(accountGroups).length > 0 && (
        <Box mt="md">
          <Text size="sm" fw={600} mb="xs">
            <Trans>Custom Dimensions by Website</Trans>
          </Text>
          <Text size="xs" c="dimmed" mb="sm">
            <Trans>Override default dimensions for specific accounts</Trans>
          </Text>

          {Object.entries(accountGroups).map(
            ([websiteId, { accounts: websiteAccounts, website }]) => {
              const isCollapsed = collapsedWebsites[websiteId] || false;

              return (
                <Card key={websiteId} withBorder mb="sm" p="sm">
                  <Group
                    gap="xs"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleWebsiteCollapse(websiteId)}
                  >
                    <ActionIcon size="xs" variant="transparent" c="gray">
                      {isCollapsed ? (
                        <IconChevronRight size={14} />
                      ) : (
                        <IconChevronDown size={14} />
                      )}
                    </ActionIcon>
                    <Text size="sm" fw={500}>
                      {website.displayName}
                    </Text>
                  </Group>

                  <Collapse in={!isCollapsed}>
                    <Grid gutter="xs">
                      {websiteAccounts.map((account) => {
                        const accountDims = accountDimensions[account.id] || {
                          height: 1,
                          width: 1,
                        };
                        const hasCustomDimensions =
                          metadata.dimensions[account.id] !== undefined;

                        return (
                          <Grid.Col span={12} key={account.id} pt="xs">
                            <Box pl="42px">
                              <Group gap="xs" mb="xs">
                                <Text size="sm" fw={500}>
                                  {account.name}
                                </Text>
                                {hasCustomDimensions && (
                                  <ActionIcon
                                    size="xs"
                                    variant="subtle"
                                    c="red"
                                    onClick={() => {
                                      removeAccountDimensions(
                                        metadata,
                                        account.id,
                                      );
                                      const defaultDims =
                                        metadata.dimensions.default ?? file;
                                      updateAccountDimensionState(
                                        account.id,
                                        defaultDims.height,
                                        defaultDims.width,
                                      );
                                      save();
                                    }}
                                  >
                                    <IconTrash size={12} />
                                  </ActionIcon>
                                )}
                              </Group>

                              <Grid gutter="xs">
                                <Grid.Col span={6}>
                                  <NumberInput
                                    label={<Trans>Height</Trans>}
                                    value={accountDims.height}
                                    max={file.height}
                                    min={1}
                                    size="xs"
                                    step={10}
                                    onBlur={(event) => {
                                      const {
                                        width: aspectW,
                                        height: aspectH,
                                      } = calculateAspectRatio(
                                        Math.min(
                                          Number(event.target.value),
                                          file.height,
                                        ),
                                        accountDims.width,
                                        file.width / file.height,
                                        'h',
                                      );
                                      updateAccountDimensionState(
                                        account.id,
                                        aspectH,
                                        aspectW,
                                      );
                                      updateAccountDimensions(
                                        metadata,
                                        file,
                                        account.id,
                                        aspectH,
                                        aspectW,
                                      );
                                      save();
                                    }}
                                    onChange={(value) =>
                                      updateAccountDimensionState(
                                        account.id,
                                        Number(value) || 1,
                                        accountDims.width,
                                      )
                                    }
                                  />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                  <NumberInput
                                    label={<Trans>Width</Trans>}
                                    value={accountDims.width}
                                    max={file.width}
                                    min={1}
                                    size="xs"
                                    step={10}
                                    onBlur={(event) => {
                                      const {
                                        width: aspectW,
                                        height: aspectH,
                                      } = calculateAspectRatio(
                                        accountDims.height,
                                        Math.min(
                                          Number(event.target.value),
                                          file.width,
                                        ),
                                        file.height / file.width,
                                        'w',
                                      );
                                      updateAccountDimensionState(
                                        account.id,
                                        aspectH,
                                        aspectW,
                                      );
                                      updateAccountDimensions(
                                        metadata,
                                        file,
                                        account.id,
                                        aspectH,
                                        aspectW,
                                      );
                                      save();
                                    }}
                                    onChange={(value) =>
                                      updateAccountDimensionState(
                                        account.id,
                                        accountDims.height,
                                        Number(value) || 1,
                                      )
                                    }
                                  />
                                </Grid.Col>
                              </Grid>
                            </Box>
                          </Grid.Col>
                        );
                      })}
                    </Grid>
                  </Collapse>
                </Card>
              );
            },
          )}
        </Box>
      )}
    </Box>
  );
}
