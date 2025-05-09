import {
  Anchor,
  Box,
  Breadcrumbs,
  Group,
  Space,
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
      <>
        <Group pl="xs">
          {icon}
          <Title order={1}>{title}</Title>
        </Group>
        <Space h="xs" />
      </>
    ),
    [icon, title],
  );

  const breadcrumb = useMemo(
    () =>
      breadcrumbs && (
        <Breadcrumbs pl="xs">
          {breadcrumbs.map((bc, index) => (
            <Anchor
              c={index === breadcrumbs.length - 1 ? undefined : 'blue'}
              key={bc.target}
              onClick={(e) => {
                if (index === breadcrumbs.length - 1) return;
                onBreadcrumbClick(e, bc.target);
              }}
            >
              <em>{bc.text}</em>
            </Anchor>
          ))}
        </Breadcrumbs>
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
      {titleField}
      {breadcrumb}
      {actionField}
      {tabsField}
      {tabsField ? null : (
        <hr style={{ borderColor: 'var(--mantine-color-dimmed)' }} />
      )}
    </Box>
  );
}
