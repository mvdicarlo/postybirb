import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { SettingsService } from '../settings/settings.service';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { UpdateNotificationDto } from './dtos/update-notification.dto';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let module: TestingModule;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let webSocketMock: any;

  beforeEach(async () => {
    clearDatabase();
    webSocketMock = {
      emit: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        SettingsService,
        {
          provide: WSGateway,
          useValue: webSocketMock,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterAll(async () => {
    await module?.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a notification', async () => {
    const dto = new CreateNotificationDto();
    dto.title = 'Test Notification';
    dto.message = 'This is a test notification';
    dto.type = 'info';

    const notification = await service.create(dto);
    expect(notification).toBeDefined();
    expect(notification.title).toBe(dto.title);
    expect(notification.message).toBe(dto.message);
    expect(notification.type).toBe(dto.type);

    const notifications = await service.findAll();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBe(notification.id);
  });

  it('should update a notification', async () => {
    const createDto = new CreateNotificationDto();
    createDto.title = 'Initial Title';
    createDto.message = 'Initial Message';
    createDto.type = 'info';

    const notification = await service.create(createDto);

    const updateDto = new UpdateNotificationDto();
    updateDto.isRead = true;

    await service.update(notification.id, updateDto);

    const updatedNotification = await service.findById(notification.id);
    expect(updatedNotification.message).toBe(createDto.message); // unchanged
    expect(updatedNotification.isRead).toBe(true);
  });

  it('should emit notification updates when changes occur', async () => {
    // Create a notification which should trigger an emit
    const dto = new CreateNotificationDto();
    dto.title = 'Test Notification';
    dto.message = 'This is a test notification';
    dto.type = 'info';

    await service.create(dto);

    // Verify websocket emit was called with the correct event
    expect(webSocketMock.emit).toHaveBeenCalled();
    const emitArgs = webSocketMock.emit.mock.calls[0];
    expect(emitArgs[0].data[0].title).toBe(dto.title);
  });

  it('should initialize without websocket and not throw error', () => {
    // @ts-expect-error Test case
    const serviceWithoutWebsocket = new NotificationsService();
    expect(serviceWithoutWebsocket).toBeDefined();
  });
});
