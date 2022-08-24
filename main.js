const NodeMediaServer = require('node-media-server');
const { app, ipcMain, ipcRenderer } = require('electron');
require('@electron/remote/main').initialize();
const path = require('path');
const { menubar: Menubar } = require('menubar');

require('electron-context-menu')();

const currentStreams = new Set();
const ASSET_PATH = path.join(app.getAppPath(), 'assets');

function changeMenubarState() {
  if (currentStreams.size > 0) {
    // set recording
    menubar.tray.setImage(path.resolve(ASSET_PATH, 'img/recording.png'));
  } else {
    // set normal
    menubar.tray.setImage(path.resolve(ASSET_PATH, 'img/readyTemplate.png'));
  }
}

const configuration = {
  host: '127.0.0.1',
  port: 8000,
  endpoint: '/app',
  transcodingEnabled: false,
  // ffmpeg: 'user/path/ffmpeg'
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 60,
    ping_timeout: 30,
  },
};

const menubar = Menubar({
  dir: ASSET_PATH,
  icon: path.resolve(ASSET_PATH, 'img/readyTemplate.png'),
  height: 250,
  transparent: true,
  preloadWindow: true,
  browserWindow: {
    height: 250,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  },
});
(async () => {
  const props = {
    rtmp: configuration.rtmp,
    http: {
      port: configuration.port,
      mediaroot: './media',
      allow_origin: '*',
    },
  };

  if (configuration.transcodingEnabled) {
    props.trans = {
      ffmpeg: configuration.ffmpeg || '/opt/homebrew/bin/ffmpeg',
      tasks: [
        {
          app: 'live',
          ac: 'aac',
          hls: true,
          hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        },
      ],
    };
  }

  const nms = new NodeMediaServer(props);

  nms.on('prePublish', (id) => {
    if (!currentStreams.has(id)) {
      currentStreams.add(id);
    }
    changeMenubarState();
  });

  nms.on('donePublish', (id) => {
    currentStreams.delete(id);
    changeMenubarState();
  });

  nms.run();

  menubar.on('ready', (event) => {
    const wc = menubar.window.webContents;
    require('@electron/remote/main').enable(wc);
    wc.send('initialize', configuration);

    changeMenubarState();
  });

  ipcMain.on('app-ready', (event) => {
    event.sender.send('port-ready');
  });

  ipcMain.on('error', (event) => {
    console.error(event);
  });
})();
