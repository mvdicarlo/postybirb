import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { PlatformService } from '@postybirb/platform';
import {
    EntityCreatedEvent,
    EntityRemovedEvent,
    EntityUpdatedEvent,
    getEntityCrudEventNames,
} from '../common/events/entity-crud.events';
import { NoopPlatformService } from '../platform/testing/noop-platform-providers';
import { SettingsService } from '../settings/settings.service';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { UpdateNotificationDto } from './dtos/update-notification.dto';
import { NOTIFICATION_EVENT_PREFIX } from './notification.events';
import { NotificationsService } from './notifications.service';

const noopPlatform: PlatformService = new NoopPlatformService();

describe('NotificationsService', () => {
  let service: NotificationsService;
  let module: TestingModule;
  const emit = jest.fn();
  const eventNames = getEntityCrudEventNames(NOTIFICATION_EVENT_PREFIX);

  function createDto(title = 'Test Notification') {
    const dto = new CreateNotificationDto();
    dto.title = title;
    dto.message = 'This is a test notification';
    dto.type = 'info';
    return dto;
  }

  beforeEach(async () => {
    clearDatabase();
    emit.mockClear();

    module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        SettingsService,
        {
          provide: PlatformService,
          useValue: noopPlatform,
        },
        {
          provide: EventEmitter2,
          useValue: { emit },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(async () => {
    await module?.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a notification and emit created event', async () => {
    const dto = createDto();

    const notification = await service.create(dto);
    expect(notification.title).toBe(dto.title);
    expect(notification.message).toBe(dto.message);
    expect(notification.type).toBe(dto.type);

    const notifications = await service.findAll();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBe(notification.id);

    expect(emit).toHaveBeenCalledWith(
      eventNames.created,
      [new EntityCreatedEvent(notification.toDTO())],
    );
  });

  it('should update a notification and emit updated event', async () => {
    const notification = await service.create(createDto('Initial Title'));
    emit.mockClear();

    const updateDto = new UpdateNotificationDto();
    updateDto.isRead = true;

    const updated = await service.update(notification.id, updateDto);
    expect(updated.isRead).toBe(true);

    expect(emit).toHaveBeenCalledWith(
      eventNames.updated,
      [new EntityUpdatedEvent(updated.toDTO())],
    );
  });

  it('should remove a notification and emit removed event', async () => {
    const notification = await service.create(createDto());
    emit.mockClear();

    await service.remove(notification.id);
    expect(await service.findAll()).toHaveLength(0);

    expect(emit).toHaveBeenCalledWith(
      eventNames.removed,
      [new EntityRemovedEvent(notification.id)],
    );
  });

  it('should initialize without an event emitter and not throw', () => {
    const serviceWithoutEmitter = new NotificationsService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undefined as any,
      noopPlatform,
    );
    expect(serviceWithoutEmitter).toBeDefined();
  });
});
