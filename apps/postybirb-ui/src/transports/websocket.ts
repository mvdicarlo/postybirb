import io, { SocketOptions } from 'socket.io-client';
import {
  defaultTargetPath,
  defaultTargetProvider,
  getRemotePassword,
} from './http-client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const socketSettings: SocketOptions = {};
const remotePassword = getRemotePassword();
if (remotePassword) {
  socketSettings.auth = {
    'X-Remote-Password': remotePassword,
  };
}

const AppSocket = io(defaultTargetProvider(), socketSettings);
// eslint-disable-next-line no-console, lingui/no-unlocalized-strings
AppSocket.on('connect', () => console.log('Websocket connected'));

// We have a local socket type for remote connections where we still listen
// to local setting updates as we only want local user settings.
export function getLocalSocket() {
  const currentDefaultTarget = defaultTargetProvider();
  if (currentDefaultTarget === defaultTargetPath) {
    return AppSocket;
  }

  // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
  console.log(`Using local socket at ${currentDefaultTarget}`);
  const localSocket = io(defaultTargetPath);
  // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
  localSocket.on('connect', () => console.log('Local Websocket connected'));
  return localSocket;
}

export default AppSocket;
