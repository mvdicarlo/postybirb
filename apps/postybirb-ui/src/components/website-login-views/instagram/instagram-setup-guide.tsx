/* eslint-disable lingui/no-unlocalized-strings */
import {
  Accordion,
  Badge,
  Box,
  Checkbox,
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
  IconLogin,
  IconSettings,
  IconUserCheck,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { ExternalLink } from '../../shared/external-link';

interface SetupStep {
  id: string;
  label: string;
  link?: { href: string; label: string };
}

interface SetupSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  steps: SetupStep[];
}

const SETUP_SECTIONS: SetupSection[] = [
  {
    id: 'app-creation',
    title: 'Step 1: Create your Meta app',
    subtitle: 'Give Meta a name for your connection to Instagram',
    icon: <IconSettings size={18} />,
    steps: [
      {
        id: '1-1',
        label: 'Open Meta Developer Apps using the link below.',
        link: {
          href: 'https://developers.facebook.com/apps/',
          label: 'Open Meta Developer Apps (My Apps)',
        },
      },
      {
        id: '1-1-sign-in',
        label: 'Sign in with your Facebook account.',
      },
      {
        id: '1-1-register',
        label:
          'If Meta asks you to register as a developer, complete that registration before continuing.',
      },
      { id: '1-2', label: 'On the "My Apps" page, click "Create App".' },
      {
        id: '1-3',
        label:
          'Enter an App Name. This can be anything you want, such as "My PostyBirb Instagram".',
      },
      {
        id: '1-3-email',
        label:
          'If a contact email is requested, enter an email you can access.',
      },
      { id: '1-4', label: 'Click "Next"' },
      {
        id: '1-5',
        label: 'On the "Use cases" page, find "Filter by" in the sidebar.',
      },
      {
        id: '1-5-content',
        label: 'Under "Filter by", click "Content management".',
      },
      {
        id: '1-6',
        label: 'Select "Manage messaging & content on Instagram".',
      },
      { id: '1-7', label: 'Click "Next"' },
      {
        id: '1-8',
        label:
          'Business verification is not required for this setup with your own tester account. On the business profile or business portfolio page, select a portfolio you manage. If you do not have one, click the "Create a business portfolio" link in that section, follow the prompts to create it, then select it for this app. You only need to create and connect the portfolio; it can remain unverified. A portfolio is Meta\'s container for your app and Instagram account, separate from your Instagram account type. The help link below is available if you get stuck.',
        link: {
          href: 'https://www.facebook.com/business/help/1710077379203657',
          label: 'How to create a business portfolio',
        },
      },
      { id: '1-11', label: 'Click "Next".' },
      {
        id: '1-12',
        label: 'On the "Requirements" page, review the information.',
      },
      { id: '1-13', label: 'Click "Next".' },
      {
        id: '1-14',
        label: 'On the "Overview" page, click "Create app".',
      },
    ],
  },
  {
    id: 'unified-login',
    title: 'Step 2: Choose Unified Login',
    subtitle: 'Tell Meta which Instagram connection to create',
    icon: <IconSettings size={18} />,
    steps: [
      {
        id: '2-1',
        label:
          'On your new app\'s Dashboard, find the "App customization and requirements" section.',
      },
      {
        id: '2-1-customize',
        label:
          'In that section, click "Customize the Manage messaging & content on Instagram use case".',
      },
      {
        id: '2-2',
        label: 'If that Dashboard link is not shown, open "Use cases" instead.',
      },
      {
        id: '2-3',
        label:
          'Click "API setup with Unified Login". Do not choose the separate Instagram business login or Facebook login setup.',
      },
      {
        id: '2-4',
        label: 'Find the "Configure your app" section.',
      },
      {
        id: '2-4-create',
        label: 'In that section, click "Create new configuration".',
      },
      {
        id: '2-5',
        label:
          'If a popup asks how to create it, click "Create from template". This gives you Meta\'s default settings instead of making you configure everything yourself.',
      },
      {
        id: '2-6',
        label:
          'In the configuration preview, keep the required permissions enabled.',
      },
      {
        id: '2-6-publishing',
        label:
          'Check that "instagram_content_publish" is included. This is the permission that allows PostyBirb to publish posts. The default template includes it.',
      },
      {
        id: '2-7',
        label:
          'If Meta shows a "Use this configuration" button, click it. Leave this developer page open for the next steps.',
      },
    ],
  },
  {
    id: 'tester-invitation',
    title: 'Step 3: Add your Instagram account',
    subtitle: 'Invite your account as a tester, then accept the invitation',
    icon: <IconUserCheck size={18} />,
    steps: [
      {
        id: '3-1',
        label:
          'On "API setup with Unified Login", expand "Generate access tokens" by clicking its heading or arrow.',
      },
      { id: '3-2', label: 'Click "Add account".' },
      {
        id: '3-3',
        label: 'In the popup, click "Continue".',
      },
      {
        id: '3-4',
        label: 'Select "Instagram Tester".',
      },
      {
        id: '3-5',
        label:
          'In the text box, type the Instagram username of the account you want to post with.',
      },
      { id: '3-6', label: 'Click "Add". The invitation is now pending.' },
      {
        id: '3-7',
        label: 'Open the Instagram link below in a new browser tab.',
        link: {
          href: 'https://www.instagram.com/accounts/manage_access/',
          label: 'Open Instagram Apps and Websites',
        },
      },
      {
        id: '3-7-sign-in',
        label:
          'Sign in as the exact Instagram account you just invited, not a different account.',
      },
      {
        id: '3-8',
        label:
          'On Instagram, click the "Tester Invites" tab. This page is also available under Settings > Website permissions > Apps and websites.',
      },
      {
        id: '3-9',
        label: 'Find the pending invitation for the app you created.',
      },
      {
        id: '3-9-accept',
        label: 'Click "Accept" on that invitation.',
      },
      {
        id: '3-10',
        label: 'Return to the Meta developer tab you left open.',
      },
      {
        id: '3-10-refresh',
        label: "Refresh that page using your browser's reload button.",
      },
      {
        id: '3-11',
        label: 'Expand "Generate access tokens" again.',
      },
      {
        id: '3-11-check-account',
        label:
          'Check that your approved Instagram account is listed. If it is not, confirm you accepted the invite while signed in to the correct Instagram account.',
      },
      {
        id: '3-11-retry',
        label:
          'If the account was missing, refresh the developer page again after confirming the invite was accepted.',
      },
    ],
  },
  {
    id: 'generate-token',
    title: 'Step 4: Generate and copy your token',
    subtitle: 'Give your app permission to post as your Instagram account',
    icon: <IconKey size={18} />,
    steps: [
      {
        id: '4-1',
        label:
          'Next to your approved account, click "Generate token". A login popup should open.',
      },
      {
        id: '4-1-allow-popups',
        label:
          'If no popup opens, allow popups for the Meta developer site in your browser. If the popup opened normally, skip the next instruction.',
      },
      {
        id: '4-1-retry',
        label: 'After allowing popups, click "Generate token" again.',
      },
      {
        id: '4-2',
        label:
          'In the popup, log in to the Instagram account you want to post with.',
      },
      { id: '4-3', label: 'Click "Continue".' },
      {
        id: '4-4',
        label:
          'If Meta asks you to choose a business portfolio, select the one that contains your Instagram account.',
      },
      {
        id: '4-4-instagram-account',
        label:
          'If Meta asks which Instagram accounts to share, select only the account you want to connect. PostyBirb currently connects one Instagram account per token.',
      },
      {
        id: '4-5',
        label:
          'Review the requested access. Keep the permission to publish content enabled.',
      },
      {
        id: '4-5-continue',
        label: 'Complete any remaining "Continue" prompts.',
      },
      { id: '4-6', label: 'Click "Save" to finish granting access.' },
      {
        id: '4-7',
        label: 'When Meta displays the token, read the notice.',
      },
      {
        id: '4-7-understand',
        label: 'Check the "I understand" checkbox.',
      },
      {
        id: '4-8',
        label:
          'Copy the full value in the "Access token" field. Copy only the token, not the words "Access token" or any surrounding quotation marks. Meta only shows this value once, so keep the popup open until you finish the next section.',
      },
    ],
  },
  {
    id: 'connect-postybirb',
    title: 'Step 5: Connect PostyBirb',
    subtitle: 'Paste the token below and check that you are logged in',
    icon: <IconLogin size={18} />,
    steps: [
      {
        id: '5-1',
        label: 'Return to this Instagram account screen in PostyBirb.',
      },
      {
        id: '5-1-token-field',
        label:
          'Scroll below this guide to the "Bearer Token" field. A bearer token is the secret key you just copied.',
      },
      {
        id: '5-2',
        label:
          'Paste the complete token into "Bearer Token". You do not need to add the word "Bearer". You do not need an App ID or App Secret.',
      },
      {
        id: '5-3',
        label: 'Click "Log In". PostyBirb saves the token for you.',
      },
      {
        id: '5-4',
        label: 'Wait for the green "Successfully logged in as" message.',
      },
      {
        id: '5-4-check-username',
        label:
          'Check that the message shows your intended Instagram username. You can now post with this account.',
      },
      {
        id: '5-5',
        label:
          'Once login succeeds, close the token popup. Keep your token private: anyone with it may be able to access your account through the app. If it expires or is revoked, generate a new token and repeat this section to replace it.',
      },
    ],
  },
];

const STORAGE_KEY = 'instagram-unified-setup-checklist';

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
            <Title order={5}>Instagram Setup Guide: Unified Login</Title>
            <Text size="xs" c="dimmed">
              Follow each step in order. Check off the boxes as you go; your
              progress is saved on this device. If a step does not apply to your
              screen, check it off and continue.
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
              All setup steps checked! Confirm PostyBirb shows you as logged in.
            </Text>
          </Group>
        )}

        <Text size="sm">
          You do not need to write any code or build your own application. Here,
          a Meta app is a set of settings that lets PostyBirb connect to your
          Instagram account. You will create those settings in your browser,
          then copy a secret access token into PostyBirb.
        </Text>

        <Text size="sm" c="orange">
          Before you start, your Instagram account must be a Professional
          account (Business or Creator), not a personal account. In Instagram,
          open your profile, then the menu, then Settings and activity. Look for
          Account type and tools, then Switch to professional account. Menu
          names may vary. You do not need a Facebook Page for Unified Login.
        </Text>

        <Text size="sm">
          This guide is for connecting your own account as a tester. You can
          leave your Meta app in Development mode; App Review and business
          verification are not required for this tester setup. Connecting other
          people outside your app roles may require both. You do not need to
          configure a redirect URL or webhooks for this manual-token setup.
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
                      <Stack key={step.id} gap={4}>
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
                        {step.link && (
                          <Box ml={30} fz="sm">
                            <ExternalLink href={step.link.href}>
                              {step.link.label}
                            </ExternalLink>
                          </Box>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>

        <Text size="xs" c="dimmed">
          Meta sometimes changes button names or page layouts. If your screen
          looks different, use the matching section names above or consult
          Meta&apos;s instructions.
        </Text>
        <ExternalLink href="https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started">
          Official Meta Unified Login setup instructions
        </ExternalLink>
        <ExternalLink href="https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/eligibility-and-troubleshooting">
          Official Meta setup troubleshooting
        </ExternalLink>
      </Stack>
    </Paper>
  );
}
