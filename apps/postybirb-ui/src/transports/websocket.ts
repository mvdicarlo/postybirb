import io from 'socket.io-client';
import { defaultTargetProvider } from './http-client';

const AppSocket = io(defaultTargetProvider());
AppSocket.on('connect', () => console.log('Websocket connected'));

export default AppSocket;
