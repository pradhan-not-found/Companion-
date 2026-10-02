const { app, BrowserWindow, ipcMain, screen, protocol, net } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')

let win
let walkInterval = null
let walkDx = 0

function createWindow() {
  win = new BrowserWindow({
    width: 200,
    height: 180,
    center: true,
    transparent: true,
    frame: false,
    roundedCorners: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    icon: path.join(__dirname, 'public', 'applogo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  } else {
    win.loadURL('http://localhost:5173')
  }

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })
}

/** Start the cat walking in a given direction.
 *  The main process owns the movement loop + bounds logic. */
function startWalk(dx) {
  if (walkInterval) clearInterval(walkInterval)
  walkDx = dx

  walkInterval = setInterval(() => {
    if (!win) return
    const { workAreaSize } = screen.getPrimaryDisplay()
    const [x, y] = win.getPosition()
    const [w]    = win.getSize()

    let nextX   = x + walkDx
    let flipped = false

    // Clamp to left edge
    if (nextX < 0) {
      nextX   = 0
      walkDx  = Math.abs(walkDx)
      flipped = true
    }
    // Clamp to right edge
    if (nextX + w > workAreaSize.width) {
      nextX   = workAreaSize.width - w
      walkDx  = -Math.abs(walkDx)
      flipped = true
    }

    win.setPosition(nextX, y)

    // Tell the renderer which direction we're now facing
    if (flipped && win && !win.isDestroyed()) {
      win.webContents.send('walk-direction', walkDx)
    }
  }, 40) // 25 fps
}

function stopWalk() {
  if (walkInterval) clearInterval(walkInterval)
  walkInterval = null
  walkDx = 0
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
  // Register custom protocol to serve pets from bundled public/pets
  protocol.handle('pet', (request) => {
    // pet://<pet_id>/<file>
    const urlStr = request.url.substring('pet://'.length);
    const parts = urlStr.split('/');
    const petId = parts[0];
    let file = parts[1];
    
    if (file === 'auto') {
      try {
        const jsonPath = path.join(__dirname, 'public', 'pets', petId, 'pet.json');
        const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        file = json.spritesheetPath || 'spritesheet.webp';
      } catch (e) {
        file = 'spritesheet.webp';
      }
    }
    
    const petPath = path.join(__dirname, 'public', 'pets', petId, file);
    return net.fetch('file://' + petPath);
  });

  createWindow()

  ipcMain.handle('get-pets', () => {
    try {
      const petsDir = path.join(__dirname, 'public', 'pets');
      const dirs = fs.readdirSync(petsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      
      const pets = [];
      for (const dir of dirs) {
        try {
          const json = JSON.parse(fs.readFileSync(path.join(petsDir, dir, 'pet.json'), 'utf8'));
          pets.push(json);
        } catch (e) {
          // ignore
        }
      }
      return pets;
    } catch (e) {
      return [];
    }
  });

  ipcMain.on('walk-start', (_, dx) => startWalk(dx))
  ipcMain.on('walk-stop',  ()      => stopWalk())
  ipcMain.on('close-window', ()    => win?.close())
  ipcMain.on('minimize-window', () => win?.minimize())
  ipcMain.on('maximize-window', () => win?.isMaximized() ? win.restore() : win.maximize())
  
  const storePath = path.join(app.getPath('userData'), 'companion-store.json');
  ipcMain.handle('get-store', () => {
    try {
      if (fs.existsSync(storePath)) {
        return JSON.parse(fs.readFileSync(storePath, 'utf8'));
      }
    } catch(e) {}
    return {};
  });
  
  ipcMain.on('set-store', (event, key, value) => {
    try {
      let data = {};
      if (fs.existsSync(storePath)) {
        data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      }
      data[key] = value;
      fs.writeFileSync(storePath, JSON.stringify(data));
    } catch(e) {}
  });

  let dragTimer = null;
  let dragOffset = { x: 0, y: 0 };
  ipcMain.on('pet-drag-start', (e, offset) => {
    dragOffset = offset;
    if (dragTimer) clearInterval(dragTimer);
    dragTimer = setInterval(() => {
      if (win) {
        const cursor = screen.getCursorScreenPoint();
        win.setPosition(cursor.x - dragOffset.x, cursor.y - dragOffset.y);
      }
    }, 16);
  });
  ipcMain.on('pet-drag-stop', () => {
    if (dragTimer) clearInterval(dragTimer);
    dragTimer = null;
  });

  ipcMain.on('set-window-size', (event, width, height) => {
    if (!win) return;
    win.setSize(width, height);
    win.center();
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
}

app.on('window-all-closed', () => {
  stopWalk()
  if (process.platform !== 'darwin') app.quit()
})
