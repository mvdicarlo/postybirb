import { useLingui } from '@lingui/react';
import { Menu, Text, UnstyledButton } from '@mantine/core';
import { IconLanguageHiragana } from '@tabler/icons-react';
import { use18n } from '../../hooks/use-i18n';
import { languages } from '../languages';

export function LanguagePicker() {
  const { _ } = useLingui();
  const [locale, setLocale] = use18n();

  return (
    <div>
      <Menu
        withArrow
        shadow="md"
        width="200"
        position="right"
        trigger="hover"
        closeDelay={200}
      >
        <Menu.Target>
          <UnstyledButton>
            <IconLanguageHiragana height={30} />
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          {languages.map(([label, value]) => (
            <Menu.Item key={value} onClick={() => setLocale(value)}>
              <Text c={value === locale ? 'blue' : undefined}>{_(label)}</Text>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}
