// This is example file showing how to define custom messages

import { Trans } from '@lingui/macro';
import { TranslationMessages } from '../../components/translations/translation';

declare module '@postybirb/types' {
  interface ValidationMessages {
    'discord.webhook.name': {
      name: string;
    };
  }
}

TranslationMessages['discord.webhook.name'] = (props) => {
  const { name } = props.values;
  return <Trans>Webhook name {name} is invalid</Trans>;
};

export {};
