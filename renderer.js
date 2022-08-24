const { ipcRenderer, clipboard } = require('electron');
const remote = require('@electron/remote');
const template = require('lodash/template');
const fs = require('fs');
const path = require('path');
const filesize = require('filesize');

let streamsTemplate = null;
let streamsContainer = null;
let configuration = null;
ipcRenderer.on('initialize', (e, aConfiguration) => {
  configuration = aConfiguration;
  streamsTemplate = template(
    fs.readFileSync(
      path.join(remote.app.getAppPath(), 'assets/streams.ejs'),
      'utf8'
    )
  );
  streamsContainer = document.getElementById('streams');

  ipcRenderer.send('app-ready');
});

function fetchStreamInfo() {
  fetch(`http://${configuration.host}:${configuration.port}/api/streams`)
    .then((res) => res.json())
    .then((res) => {
      streamsContainer.innerHTML = streamsTemplate({
        ...res,
        configuration,
        rtmpUri: `rtmp://${configuration.host}${configuration.endpoint}`,
        tools: {
          filesize,
        },
      });

      [...streamsContainer.querySelectorAll('.copy')].forEach((el) => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          const text = el.parentElement.querySelector('code').innerText;
          clipboard.writeText(text);
        });
      });
    });
}

document.querySelector('.quit').addEventListener('click', () => {
  remote.app.quit();
});

ipcRenderer.on('port-ready', (e) => {
  fetchStreamInfo();
  setInterval(() => fetchStreamInfo(), 5000);
});
