import {
  Anchor,
  Box,
  Breadcrumbs,
  Flex,
  Group,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import './page-header.css';

type PageHeaderProps = {
  icon: JSX.Element;
  title: JSX.Element | string;
  tabs?: {
    label: JSX.Element;
    key: string;
    icon: JSX.Element;
    disabled?: boolean;
  }[];
  onTabChange?: (tab: string) => void;
  breadcrumbs?: {
    text: JSX.Element | string;
    target: string;
  }[];
  actions?: JSX.Element[];
};

export function PageHeader(props: PageHeaderProps) {
  const { actions, icon, title, tabs, breadcrumbs, onTabChange } = props;
  const navigateTo = useNavigate();
  const onBreadcrumbClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, target: string) => {
      e.preventDefault();
      e.stopPropagation();
      navigateTo(target);
    },
    [navigateTo],
  );
  const titleField = useMemo(
    () => (
      <Box className="postybirb__page-header__title-section">
        <Group className="postybirb__page-header__title-group">
          <Box className="postybirb__page-header__icon-container">{icon}</Box>
          <Title order={2} className="postybirb__page-header__title">
            {title}
          </Title>
        </Group>
      </Box>
    ),
    [icon, title],
  );
  const breadcrumb = useMemo(
    () =>
      breadcrumbs && (
        <Box className="postybirb__page-header__breadcrumbs">
          <Breadcrumbs separator="›">
            {breadcrumbs.map((bc, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <Anchor
                  key={bc.target}
                  className={`postybirb__page-header__breadcrumb ${
                    isLast ? 'current' : ''
                  }`}
                  onClick={(e) => {
                    if (isLast) return;
                    onBreadcrumbClick(e, bc.target);
                  }}
                  style={{ cursor: isLast ? 'default' : 'pointer' }}
                >
                  {bc.text}
                </Anchor>
              );
            })}
          </Breadcrumbs>
        </Box>
      ),
    [breadcrumbs, onBreadcrumbClick],
  );

  const actionField = useMemo(
    () =>
      actions && (
        <Group my="4" pl="xs">
          {actions}
        </Group>
      ),
    [actions],
  );

  const tabsField = useMemo(
    () =>
      tabs &&
      tabs.length && (
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
                disabled={tab.disabled}
              >
                {tab.icon ? (
                  <Text
                    inherit
                    span
                    className="postybirb__page-header__tabs__icon"
                  >
                    {tab.icon}
                  </Text>
                ) : null}
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      ),
    [tabs, onTabChange],
  );

  return (
    <Box className="postybirb__page-header">
      <Flex className="postybirb__page-header__header-top" align="center">
        {titleField}
        <Box pl="lg">
          {breadcrumb}
          {actionField}
        </Box>
      </Flex>

      {tabsField}
      {tabsField ? null : (
        <hr style={{ borderColor: 'var(--mantine-color-dimmed)' }} />
      )}
    </Box>
  );
}
