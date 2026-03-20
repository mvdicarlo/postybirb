/* eslint-disable lingui/no-unlocalized-strings */
import {
    Accordion,
    Badge,
    Checkbox,
    Code,
    Divider,
    Group,
    Paper,
    Progress,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {
    IconCircleCheck,
    IconKey,
    IconSettings,
    IconUserCheck,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { ExternalLink } from '../../shared/external-link';

interface SetupStep {
  id: string;
  label: string;
  bold?: string[];
}

interface SetupSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  steps: SetupStep[];
}

const REDIRECT_URL = `https://localhost:${window.electron?.app_port || '9487'}/api/websites/instagram/callback`;

const SETUP_SECTIONS: SetupSection[] = [
  {
    id: 'app-creation',
    title: 'Step 1: App Creation',
    subtitle: 'Create a new Meta app for Instagram',
    icon: <IconSettings size={18} />,
    steps: [
      {
        id: '1-1',
        label: 'Go to Meta Developer Apps and click "Create App"',
      },
      { id: '1-2', label: 'Provide your App Name' },
      { id: '1-3', label: 'Provide your Email address' },
      { id: '1-4', label: 'Click "Next"' },
      {
        id: '1-5',
        label: 'Under Use Cases, select "Content management"',
      },
      {
        id: '1-6',
        label: 'Select "Manage messaging & content on Instagram"',
      },
      { id: '1-7', label: 'Click "Next"' },
      {
        id: '1-8',
        label:
          'Click the checkbox "I don\'t want to connect a business portfolio yet."',
      },
      { id: '1-9', label: 'Click "Next"' },
      { id: '1-10', label: 'Click "Next" again' },
      { id: '1-11', label: 'Click "Create App"' },
    ],
  },
  {
    id: 'keys-permissions',
    title: 'Step 2.1: Getting Keys & Permissions',
    subtitle: 'Gather your App ID and Secret',
    icon: <IconKey size={18} />,
    steps: [
      {
        id: '2a-1',
        label:
          'Open a text editor to save your App ID and Instagram App Secret',
      },
      {
        id: '2a-2',
        label:
          'Click "Customize the Manage messaging & content on Instagram use case"',
      },
      { id: '2a-3', label: 'Copy your Instagram App ID' },
      {
        id: '2a-4',
        label: 'Click "Show" on Instagram App Secret',
      },
      { id: '2a-5', label: 'Copy your Instagram App Secret' },
      { id: '2a-6', label: 'Click "Add all required permissions"' },
    ],
  },
  {
    id: 'access-tokens',
    title: 'Step 2.2: Generate Access Tokens',
    subtitle: 'Add your account as a tester and authorize',
    icon: <IconUserCheck size={18} />,
    steps: [
      { id: '2b-1', label: 'Click the "Roles" hyperlink' },
      { id: '2b-2', label: 'Click "Add People"' },
      {
        id: '2b-3',
        label:
          'In the "Add people to your app" popup, click "Instagram Tester"',
      },
      {
        id: '2b-4',
        label: 'Enter the username of your Instagram account',
      },
      { id: '2b-5', label: 'Click "Add"' },
      {
        id: '2b-6',
        label: 'Verify the status shows as "Pending"',
      },
      {
        id: '2b-7',
        label: 'Click the "Apps and Websites" hyperlink',
      },
      { id: '2b-8', label: 'Click on the "Tester Invites" tab' },
      { id: '2b-9', label: 'Click "Accept"' },
      {
        id: '2b-10',
        label:
          'Refresh the App Roles page to verify the "Pending" status is gone',
      },
      { id: '2b-11', label: 'Go back to the App Setup page' },
      { id: '2b-12', label: 'Click "Add account"' },
      { id: '2b-13', label: 'Click "Continue"' },
      { id: '2b-14', label: 'Log in to your Instagram account' },
      { id: '2b-15', label: 'Click "Allow"' },
    ],
  },
  {
    id: 'business-login',
    title: 'Step 2.3: Set Up Instagram Business Login',
    subtitle: 'Configure the redirect URL',
    icon: <IconSettings size={18} />,
    steps: [
      { id: '2c-1', label: 'Click "Set up"' },
      {
        id: '2c-2',
        label: `Paste this into the Redirect URL field:`,
      },
      { id: '2c-3', label: 'Click "Save"' },
    ],
  },
];

const STORAGE_KEY = 'instagram-setup-checklist';

function loadCheckedState(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveCheckedState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function InstagramSetupGuide() {
  const [checked, setChecked] =
    useState<Record<string, boolean>>(loadCheckedState);

  const toggleStep = useCallback((stepId: string) => {
    setChecked((prev) => {
      const next = { ...prev, [stepId]: !prev[stepId] };
      saveCheckedState(next);
      return next;
    });
  }, []);

  const totalSteps = useMemo(
    () => SETUP_SECTIONS.reduce((sum, s) => sum + s.steps.length, 0),
    [],
  );

  const completedSteps = useMemo(
    () =>
      SETUP_SECTIONS.reduce(
        (sum, s) => sum + s.steps.filter((step) => checked[step.id]).length,
        0,
      ),
    [checked],
  );

  const progressPct = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const sectionProgress = useCallback(
    (section: SetupSection) => {
      const done = section.steps.filter((s) => checked[s.id]).length;
      return { done, total: section.steps.length };
    },
    [checked],
  );

  const allDone = completedSteps === totalSteps;

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={5}>Meta App Setup Guide</Title>
            <Text size="xs" c="dimmed">
              Complete these steps in the Meta Developer portal before
              continuing
            </Text>
          </div>
          <Badge color={allDone ? 'green' : 'blue'} variant="light" size="lg">
            {completedSteps} / {totalSteps}
          </Badge>
        </Group>

        <Progress
          value={progressPct}
          color={allDone ? 'green' : 'blue'}
          size="sm"
          radius="xl"
          animated={!allDone && completedSteps > 0}
        />

        {allDone && (
          <Group gap="xs">
            <ThemeIcon color="green" variant="light" size="sm">
              <IconCircleCheck size={14} />
            </ThemeIcon>
            <Text size="sm" c="green" fw={600}>
              All setup steps completed! Enter your credentials below.
            </Text>
          </Group>
        )}

        <Text size="sm">
          {'Start by visiting '}
          <ExternalLink href="https://developers.facebook.com/apps/">
            Meta Developer Apps
          </ExternalLink>
          {' and follow the steps below.'}
        </Text>

        <Text size="sm" c="orange">
          {'Your Instagram account must be a '}
          <Text span fw={600}>
            Professional account
          </Text>
          {
            ' (Business or Creator). You can convert in Instagram app → Settings → Account → Switch to Professional account.'
          }
        </Text>

        <Divider />

        <Accordion variant="separated" multiple defaultValue={['app-creation']}>
          {SETUP_SECTIONS.map((section) => {
            const { done, total } = sectionProgress(section);
            const sectionDone = done === total;

            return (
              <Accordion.Item key={section.id} value={section.id}>
                <Accordion.Control
                  icon={
                    <ThemeIcon
                      color={sectionDone ? 'green' : 'blue'}
                      variant="light"
                      size="md"
                    >
                      {sectionDone ? (
                        <IconCircleCheck size={16} />
                      ) : (
                        section.icon
                      )}
                    </ThemeIcon>
                  }
                >
                  <Group justify="space-between" pr="sm">
                    <div>
                      <Text size="sm" fw={600}>
                        {section.title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {section.subtitle}
                      </Text>
                    </div>
                    <Badge
                      color={sectionDone ? 'green' : 'gray'}
                      variant="light"
                      size="sm"
                    >
                      {done}/{total}
                    </Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    {section.steps.map((step) => (
                      <div key={step.id}>
                        <Checkbox
                          label={
                            <Text
                              size="sm"
                              td={checked[step.id] ? 'line-through' : undefined}
                              c={checked[step.id] ? 'dimmed' : undefined}
                            >
                              {step.label}
                            </Text>
                          }
                          checked={!!checked[step.id]}
                          onChange={() => toggleStep(step.id)}
                          styles={{
                            root: {
                              padding: '4px 0',
                            },
                          }}
                        />
                        {/* Show redirect URL inline for step 2c-2 */}
                        {step.id === '2c-2' && (
                          <Code
                            block
                            style={{
                              marginTop: 4,
                              marginLeft: 30,
                              fontSize: 12,
                              userSelect: 'all',
                            }}
                          >
                            {REDIRECT_URL}
                          </Code>
                        )}
                      </div>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      </Stack>
    </Paper>
  );
}
