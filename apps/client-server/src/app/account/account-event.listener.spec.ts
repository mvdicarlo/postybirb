import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { ACCOUNT_DELTA } from '@postybirb/socket-events';
import { IAccountDto } from '@postybirb/types';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { AccountEventListener } from './account-event.listener';
import {
  ACCOUNT_REMOVED,
  AccountStateChangedEvent,
  ACCOUNT_STATE_CHANGED,
  AccountRemovedEvent,
} from './account.events';

const timestamp = '2026-07-22T00:00:00.000Z';

function accountDto(id: string): IAccountDto {
  return {
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    name: id,
    website: 'test',
    groups: [],
    defaultFileTemplateId: null,
    defaultMessageTemplateId: null,
    state: {
      status: 'idle',
      isLoggedIn: false,
      pending: false,
      username: null,
      lastUpdated: null,
    },
    data: {},
    instanceCapabilities: { websiteDisplayName: 'Test', supports: [] },
  };
}

describe('AccountEventListener', () => {
  let module: TestingModule;
  let eventEmitter: EventEmitter2;
  const webSocketEmit = jest.fn();

  beforeEach(async () => {
    webSocketEmit.mockReset();
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        AccountEventListener,
        { provide: WSGateway, useValue: { emit: webSocketEmit } },
      ],
    }).compile();
    await module.init();
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(async () => {
    await module.close();
  });

  it('maps full Account state event arrays directly to upserts', () => {
    const first = accountDto('first');
    const second = accountDto('second');

    eventEmitter.emit(ACCOUNT_STATE_CHANGED, [
      new AccountStateChangedEvent(first),
      new AccountStateChangedEvent(second),
    ]);

    expect(webSocketEmit).toHaveBeenCalledWith({
      event: ACCOUNT_DELTA,
      data: { upserts: [first, second], removedIds: [] },
    });
  });

  it('maps Account removal event arrays directly to removals', () => {
    eventEmitter.emit(ACCOUNT_REMOVED, [
      new AccountRemovedEvent('first'),
      new AccountRemovedEvent('second'),
    ]);

    expect(webSocketEmit).toHaveBeenCalledWith({
      event: ACCOUNT_DELTA,
      data: { upserts: [], removedIds: ['first', 'second'] },
    });
  });
});
