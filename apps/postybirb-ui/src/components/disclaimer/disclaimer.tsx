import { Trans } from '@lingui/react/macro';
import {
  Button,
  Checkbox,
  Container,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { isElectron } from '../../utils';

export type DisclaimerProps = {
  onAccepted: () => void;
  onDeclined: () => void;
};

const DISCLAIMER_KEY = 'pb_disclaimer_accepted';

// Best-effort attempt to close the app when user declines.
function attemptAppQuit(): boolean {
  try {
    // Use the official preload-exposed API
    if (window?.electron?.quit) {
      window.electron.quit();
      return true;
    }
  } catch {
    // ignore and fallback
  }

  // Fallbacks: close the window; if blocked, navigate away
  window.close();
  setTimeout(() => {
    try {
      // As a last resort, navigate to a blank page to effectively end the session
      // (useful during dev in a browser environment)
      if (!document.hidden) {
        window.location.href = 'about:blank';
      }
    } catch {
      // no-op
    }
  }, 300);

  return false;
}

export function DisclaimerDisplay({ onAccepted, onDeclined }: DisclaimerProps) {
  const [checked, setChecked] = useState(false);

  // trap scroll focus on the content area for smaller windows
  const viewportHeight = useMemo(
    () => (typeof window !== 'undefined' ? window.innerHeight : 800),
    [],
  );

  useEffect(() => {
    // ensure focus is within the paper for accessibility
    const el = document.getElementById('disclaimer-title');
    el?.focus?.();
  }, []);

  const decline = () => {
    onDeclined();
    attemptAppQuit();
  };

  return (
    <Container
      size="lg"
      mih={viewportHeight}
      style={{ display: 'flex', alignItems: 'center' }}
    >
      <Paper
        shadow="md"
        p="xl"
        radius="md"
        withBorder
        style={{ width: '100%' }}
      >
        <Stack gap="md">
          <Title id="disclaimer-title" order={2} tabIndex={-1}>
            <Trans>Legal Notice & Disclaimer</Trans>
          </Title>
          <ScrollArea.Autosize mah={320} type="always">
            <Stack gap="sm">
              <Text size="sm">
                <Trans>
                  By using this application, you acknowledge that you are solely
                  responsible for how you use it and for any content you create,
                  upload, distribute, or interact with. The authors and
                  maintainers provide this software as is without warranties of
                  any kind and are not liable for any damages or losses
                  resulting from its use.
                </Trans>
              </Text>
              <Text size="sm">
                <Trans>
                  You agree to comply with all applicable laws, terms of
                  service, and policies of any third party platforms you connect
                  to or interact with through this application. Do not use this
                  software to infringe intellectual property rights, violate
                  privacy, or circumvent platform rules.
                </Trans>
              </Text>
              <Text size="sm">
                <Trans>
                  If you do not agree with these terms, you must decline and
                  exit the application.
                </Trans>
              </Text>
            </Stack>
          </ScrollArea.Autosize>

          <Checkbox
            checked={checked}
            onChange={(e) => setChecked(e.currentTarget.checked)}
            label={
              <Trans>I have read, understand, and accept the disclaimer.</Trans>
            }
          />

          <Group justify="space-between" mt="sm">
            <Button variant="default" color="gray" onClick={decline}>
              <Trans>Decline and Exit</Trans>
            </Button>
            <Button color="teal" onClick={onAccepted} disabled={!checked}>
              <Trans>Accept and Continue</Trans>
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function Disclaimer({ children }: PropsWithChildren<{}>) {
  const initialAccepted = useMemo(() => {
    try {
      if (typeof window === 'undefined') return false;
      return localStorage.getItem(DISCLAIMER_KEY) === 'true';
    } catch {
      return false;
    }
  }, []);

  const [accepted, setAccepted] = useState(initialAccepted);

  useEffect(() => {
    try {
      if (accepted) localStorage.setItem(DISCLAIMER_KEY, 'true');
    } catch {
      // ignore storage errors
    }
  }, [accepted]);

  const handleDecline = (): void => {
    // Best-effort quit from here too, in case Disclaimer fallback paths fail.
    try {
      if (isElectron() && window?.electron?.quit) {
        window.electron.quit();
        return;
      }
    } catch {
      // fall through
    }

    // Fallbacks for browser/dev
    window.close();
    setTimeout(() => {
      try {
        if (!document.hidden) {
          window.location.href = 'about:blank';
        }
      } catch {
        // no-op
      }
    }, 300);
  };

  if (!accepted) {
    return (
      <DisclaimerDisplay
        onAccepted={() => setAccepted(true)}
        onDeclined={handleDecline}
      />
    );
  }

  return children;
}
