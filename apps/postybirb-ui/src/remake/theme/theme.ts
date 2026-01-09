import type { MantineThemeOverride } from '@mantine/core';
import {
  Card,
  Container,
  createTheme,
  LoadingOverlay,
  Modal,
  Overlay,
  Paper,
  Popover,
  rem,
  ScrollArea,
  Select,
  Tooltip,
} from '@mantine/core';
import type { MantinePrimaryColor } from '../stores/ui/appearance-store';

// ============================================================================
// Z-Index Scale (mirrors CSS variables in layout.css)
// ============================================================================
const Z_INDEX = {
  sticky: 10,
  modalOverlay: 300,
  modal: 301,
  popover: 500,
  tooltip: 600,
} as const;

const CONTAINER_SIZES: Record<string, string> = {
  xxs: rem('200px'),
  xs: rem('300px'),
  sm: rem('400px'),
  md: rem('500px'),
  lg: rem('600px'),
  xl: rem('1400px'),
  xxl: rem('1600px'),
};

/**
 * Create a Mantine theme with the specified primary color.
 */
export function createAppTheme(
  primaryColor: MantinePrimaryColor = 'red',
): MantineThemeOverride {
  return createTheme({
    /** Put your mantine theme override here */
    fontSizes: {
      xs: rem('12px'),
      sm: rem('14px'),
      md: rem('16px'),
      lg: rem('18px'),
      xl: rem('20px'),
      '2xl': rem('24px'),
      '3xl': rem('30px'),
      '4xl': rem('36px'),
      '5xl': rem('48px'),
    },
    spacing: {
      '3xs': rem('4px'),
      '2xs': rem('8px'),
      xs: rem('10px'),
      sm: rem('12px'),
      md: rem('16px'),
      lg: rem('20px'),
      xl: rem('24px'),
      '2xl': rem('28px'),
      '3xl': rem('32px'),
    },
    primaryColor,
    components: {
      /** Put your mantine component override here */
      Container: Container.extend({
        vars: (_, { size, fluid }) => ({
          root: {
            '--container-size': fluid
              ? '100%'
              : size !== undefined && size in CONTAINER_SIZES
                ? CONTAINER_SIZES[size]
                : rem(size),
          },
        }),
      }),
      Paper: Paper.extend({
        defaultProps: {
          p: 'md',
          shadow: 'xl',
          radius: 'md',
          withBorder: true,
        },
      }),

      Card: Card.extend({
        defaultProps: {
          p: 'md',
          shadow: 'sm',
          radius: 'var(--mantine-radius-default)',
          withBorder: true,
        },
      }),
      Select: Select.extend({
        defaultProps: {
          checkIconPosition: 'right',
        },
      }),
      ScrollArea: ScrollArea.extend({
        defaultProps: {
          scrollbarSize: '6px',
        },
      }),

      // Z-Index defaults for overlay components
      Modal: Modal.extend({
        defaultProps: {
          zIndex: Z_INDEX.modal,
        },
      }),
      Tooltip: Tooltip.extend({
        defaultProps: {
          zIndex: Z_INDEX.tooltip,
        },
      }),
      Popover: Popover.extend({
        defaultProps: {
          zIndex: Z_INDEX.popover,
        },
      }),
      Overlay: Overlay.extend({
        defaultProps: {
          zIndex: Z_INDEX.sticky,
        },
      }),
      LoadingOverlay: LoadingOverlay.extend({
        defaultProps: {
          zIndex: Z_INDEX.sticky,
        },
      }),
    },
    other: {
      style: 'mantine',
    },
  });
}

/**
 * Default theme instance (for backwards compatibility).
 */
export const theme = createAppTheme('teal');
