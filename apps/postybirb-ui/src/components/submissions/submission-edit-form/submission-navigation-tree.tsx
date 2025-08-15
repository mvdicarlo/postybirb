import { Trans } from '@lingui/macro';
import {
  Box,
  Group,
  Paper,
  Stack,
  Text,
  Tree,
  TreeNodeData,
  useTree,
} from '@mantine/core';
import { IAccountDto, WebsiteOptionsDto } from '@postybirb/types';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconExclamationCircle,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { SubmissionDto } from '../../../models/dtos/submission.dto';

type SubmissionNavigationTreeProps = {
  submission: SubmissionDto;
  defaultOption: WebsiteOptionsDto;
  optionsGroupedByWebsiteId: [
    string,
    { account: IAccountDto; options: WebsiteOptionsDto[] },
  ][];
  top: number;
};

export function SubmissionNavigationTree(props: SubmissionNavigationTreeProps) {
  const { submission, defaultOption, optionsGroupedByWebsiteId, top } = props;
  const [activeSection, setActiveSection] = useState<string>(defaultOption.id);

  // Get all section IDs for intersection observer
  const sectionIds = useMemo(() => {
    const ids = [defaultOption.id];
    optionsGroupedByWebsiteId.forEach(([, group]) => {
      group.options.forEach((o) => ids.push(o.id));
    });
    return ids;
  }, [defaultOption.id, optionsGroupedByWebsiteId]);

  // Set up intersection observer to track which section is in view
  useEffect(() => {
    const topMargin = -(top + 20);
    const bottomMargin = -50;
    // eslint-disable-next-line lingui/no-unlocalized-strings
    const rootMargin = `${topMargin}px 0px ${bottomMargin}% 0px`;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that's most visible
        let maxRatio = 0;
        let mostVisibleId = defaultOption.id;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleId = entry.target.id;
          }
        });

        if (maxRatio > 0) {
          setActiveSection(mostVisibleId);
        }
      },
      {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        rootMargin, // Account for sticky header
      },
    );

    // Observe all section elements
    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [sectionIds, top, defaultOption.id]);

  const navTree: TreeNodeData[] = useMemo(
    () => [
      {
        value: defaultOption.id,
        label: <Trans>Default</Trans>,
      },
      ...optionsGroupedByWebsiteId.map(([, group]) => {
        const { account } = group;
        return {
          value: account.id,
          label: (
            <Text fw={600}>
              {account.websiteInfo.websiteDisplayName ?? <Trans>Unknown</Trans>}
            </Text>
          ),
          children: group.options.map((o) => {
            const validation = submission.validations.find(
              (v) => v.id === o.id,
            );
            const hasErrors = !!validation?.errors?.length;
            const hasWarnings = !!validation?.warnings?.length;
            return {
              label: (
                <Group gap="xs" wrap="nowrap">
                  {hasErrors ? (
                    <IconExclamationCircle size="1rem" color="red" />
                  ) : hasWarnings ? (
                    <IconAlertTriangle size="1rem" color="orange" />
                  ) : null}
                  <Text size="sm" truncate>
                    {account.name}
                  </Text>
                </Group>
              ),
              value: o.id,
            };
          }),
        };
      }),
    ],
    [defaultOption.id, optionsGroupedByWebsiteId, submission.validations],
  );

  const tree = useTree({
    initialExpandedState: navTree.reduce(
      (acc, node) => ({ ...acc, [node.value]: true }),
      {},
    ),
  });

  // Update expanded state when navTree changes (e.g., when new websites are added)
  useEffect(() => {
    const newExpandedState = navTree.reduce(
      (acc, node) => ({ ...acc, [node.value]: true }),
      {},
    );
    
    // Only update if there are new nodes to expand
    const currentExpanded = tree.expandedState;
    const hasNewNodes = Object.keys(newExpandedState).some(
      key => !(key in currentExpanded)
    );
    
    if (hasNewNodes) {
      tree.setExpandedState(newExpandedState);
    }
  }, [navTree, tree]);

  return (
    <Box
      pos="sticky"
      h="fit-content"
      style={{ width: '200px', top: `${top}px` }}
      className="postybirb__submission-nav-tree"
    >
      <Paper withBorder m="md" p="md" shadow="sm">
        <Stack gap="xs">
          <Text fw={700} ta="center">
            <Trans>Sections</Trans>
          </Text>
          <Tree
            tree={tree}
            data={navTree}
            selectOnClick
            renderNode={({
              node,
              expanded,
              hasChildren,
              elementProps,
              level,
            }) => {
              const isActive = activeSection === node.value;

              return (
                <Group
                  gap={5}
                  {...elementProps}
                  style={{
                    ...elementProps.style,
                    // eslint-disable-next-line lingui/no-unlocalized-strings
                    padding: '6px 8px',
                    borderRadius: '4px',
                    marginLeft: level > 1 ? `${level * 6}px` : 0,
                    ...(isActive && {
                      color: 'var(--mantine-color-blue-6)',
                      fontWeight: 500,
                    }),
                  }}
                >
                  {hasChildren && (
                    <IconChevronDown
                      size={18}
                      style={{
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        // eslint-disable-next-line lingui/no-unlocalized-strings
                        transition: 'transform 200ms ease',
                      }}
                    />
                  )}

                  {!hasChildren && level > 0 && (
                    <Box w={18} /> // Empty space for alignment when no chevron
                  )}

                  <Box
                    component="span"
                    style={{ cursor: hasChildren ? 'default' : 'pointer' }}
                    onClick={(e) => {
                      if (!hasChildren) {
                        e.stopPropagation();
                        const el = document.getElementById(node.value);
                        el?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                          inline: 'nearest',
                        });
                      }
                    }}
                  >
                    {node.label}
                  </Box>
                </Group>
              );
            }}
          />
        </Stack>
      </Paper>
    </Box>
  );
}
