import io, { ManagerOptions, SocketOptions } from 'socket.io-client';
import { defaultTargetProvider, getRemotePassword } from './http-client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const socketSettings: Partial<ManagerOptions & SocketOptions> = {};
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
// eslint-disable-next-line no-console, lingui/no-unlocalized-strings
AppSocket.on('connect', () => console.log('Websocket connected'));

export default AppSocket;
