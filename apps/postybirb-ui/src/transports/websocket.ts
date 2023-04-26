import io from 'socket.io-client';
import { getUrlSource } from './https';

const AppSocket = io(getUrlSource());
AppSocket.on('connect', () => console.log('Websocket connected'));

export default AppSocket;
