const { setInterval } = require('timers/promises');

const counter = { times: 0 };

async function waitFor(fn) {
  const interval = setInterval(500);

  for await (const i of interval) {
    if (fn()) {
      break;
    }
  }

  clearInterval(interval);
  console.log(interval);
}

function logAndRun() {
  console.log('runner');
  if (counter.times >= 3) {
    return true;
  }

  counter.times++;
}
waitFor(logAndRun).then(() => console.log('done'));
