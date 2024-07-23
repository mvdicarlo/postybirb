import {
  Anchor,
  Box,
  Breadcrumbs,
  Group,
  Space,
  Tabs,
  Title,
} from '@mantine/core';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import './page-header.css';

type PageHeaderProps = {
  icon: JSX.Element;
  title: JSX.Element | string;
  tabs?: {
    label: JSX.Element;
    key: string;
    icon: JSX.Element;
  }[];
  onTabChange?: (tab: string) => void;
  breadcrumbs?: {
    text: JSX.Element | string;
    target: string;
  }[];
};

export function PageHeader(props: PageHeaderProps) {
  const { icon, title, tabs, breadcrumbs, onTabChange } = props;
  const navigateTo = useNavigate();
  const onBreadcrumbClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, target: string) => {
      e.preventDefault();
      e.stopPropagation();
      navigateTo(target);
    },
    [navigateTo]
  );

  return (
    <Box className="postybirb__page-header">
      <Group>
        {icon}
        <Title order={1}>{title}</Title>
      </Group>
      <Space h="xs" />
      {breadcrumbs && (
        <Breadcrumbs>
          {breadcrumbs.map((bc, index) => (
            <Anchor
              c={index === breadcrumbs.length - 1 ? undefined : 'blue'}
              key={bc.target}
              onClick={(e) => {
                if (index === breadcrumbs.length - 1) return;
                onBreadcrumbClick(e, bc.target);
              }}
            >
              {bc.text}
            </Anchor>
          ))}
        </Breadcrumbs>
      )}
      {tabs && tabs.length && (
        <Tabs
          defaultValue={tabs[0].key}
          className="postybirb__page-header__tabs"
        >
          <Tabs.List>
            {tabs.map((tab) => (
              <Tabs.Tab
                key={tab.key}
                value={tab.key}
                onClick={() => onTabChange && onTabChange(tab.key)}
              >
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      )}
      <hr style={{ borderColor: 'var(--mantine-color-dimmed)' }} />
    </Box>
  );
}
