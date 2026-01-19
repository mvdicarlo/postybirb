import { AccountId } from '@postybirb/types';

export class TriggerAccountLoginCommand {
  constructor(public readonly accountId: AccountId) {}
}
