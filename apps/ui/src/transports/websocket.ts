import io from 'socket.io-client';

const AppSocket = io(`https://localhost:${window.electron.app_port}`);
AppSocket.on('connect', () => console.log('Websocket connected'));

export default AppSocket;
