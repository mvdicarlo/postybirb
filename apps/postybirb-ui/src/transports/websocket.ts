import io from 'socket.io-client';
import { defaultTargetProvider } from './http-client';

const AppSocket = io(defaultTargetProvider());
// eslint-disable-next-line no-console, lingui/no-unlocalized-strings
AppSocket.on('connect', () => console.log('Websocket connected'));

export default AppSocket;
