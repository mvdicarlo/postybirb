import io, { ManagerOptions, SocketOptions } from 'socket.io-client';
import { defaultTargetProvider, getRemotePassword } from './http-client';

// Retry configuration
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const BACKOFF_MULTIPLIER = 1.5;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const socketSettings: Partial<ManagerOptions & SocketOptions> = {
  // Automatically try to reconnect
  reconnection: true,
  // Number of reconnection attempts before giving up (Infinity = never give up)
  reconnectionAttempts: Infinity,
  // Initial reconnection delay
  reconnectionDelay: INITIAL_RETRY_DELAY,
  // Maximum delay between reconnection attempts
  reconnectionDelayMax: MAX_RETRY_DELAY,
  // Randomization factor for reconnection delay (0 = no randomization, 1 = 100% randomization)
  randomizationFactor: 0.5,
};

const remotePassword = getRemotePassword();
if (remotePassword) {
  socketSettings.transportOptions = {
    polling: {
      extraHeaders: {
        Authorization: remotePassword,
      },
    },
  };
}

const AppSocket = io(defaultTargetProvider(), socketSettings);

// Connection event handlers
// eslint-disable-next-line no-console, lingui/no-unlocalized-strings
AppSocket.on('connect', () => {
  // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
  console.log('Websocket connected successfully');
});

// eslint-disable-next-line no-console, lingui/no-unlocalized-strings
AppSocket.on('connect_error', (error) => {
  // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
  console.warn('Websocket connection error, will retry...', error.message);
});

// eslint-disable-next-line no-console, lingui/no-unlocalized-strings
AppSocket.on('reconnect_attempt', (attemptNumber) => {
  // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
  console.log(`Websocket reconnection attempt #${attemptNumber}`);
});

// eslint-disable-next-line no-console, lingui/no-unlocalized-strings
AppSocket.on('reconnect', (attemptNumber) => {
  // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
  console.log(`Websocket reconnected after ${attemptNumber} attempts`);
});

// eslint-disable-next-line no-console, lingui/no-unlocalized-strings
AppSocket.on('disconnect', (reason) => {
  // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
  console.log('Websocket disconnected:', reason);
  if (reason === 'io server disconnect') {
    // The server forcefully disconnected, manually reconnect
    AppSocket.connect();
  }
  // Otherwise, socket.io will automatically try to reconnect
});

export default AppSocket;
