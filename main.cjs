const { app, BrowserWindow, ipcMain, screen, protocol, net, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')

let win
let tray
let walkInterval = null
let walkDx = 0
let dragTimer = null
let dragOffset = { x: 0, y: 0 }

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Safely set window position, always using integers (prevents native conversion crash) */
function safeSetPosition(x, y) {
  if (!win || win.isDestroyed()) return
  win.setPosition(Math.round(x), Math.round(y))
}

/** Safely set window size, always using integers */
function safeSetSize(w, h) {
  if (!win || win.isDestroyed()) return
  win.setSize(Math.round(w), Math.round(h))
}

// ── Window ────────────────────────────────────────────────────────────────────

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
    skipTaskbar: true,
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
  win.setAlwaysOnTop(true, 'screen-saver')
  win.on('closed', () => { win = null })
}

// ── System Tray ───────────────────────────────────────────────────────────────

function createTray() {
  const iconPath = path.join(__dirname, 'public', 'applogo.png')
  let trayIcon
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  } catch (e) {
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('Companion')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => { if (win) { win.show(); win.focus() } else createWindow() } },
    { type: 'separator' },
    { label: 'Quit Companion', click: () => { app.isQuiting = true; app.quit() } }
  ])
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => {
    if (win) { win.show(); win.focus() } else createWindow()
  })
}

// ── Walk ──────────────────────────────────────────────────────────────────────

function startWalk(dx) {
  if (walkInterval) clearInterval(walkInterval)
  walkDx = Math.round(dx)

  walkInterval = setInterval(() => {
    if (!win || win.isDestroyed()) return
    const { workAreaSize } = screen.getPrimaryDisplay()
    const [x, y] = win.getPosition()
    const [w]    = win.getSize()

    let nextX   = x + walkDx
    let flipped = false

    if (nextX < 0) {
      nextX   = 0
      walkDx  = Math.abs(walkDx)
      flipped = true
    }
    if (nextX + w > workAreaSize.width) {
      nextX   = workAreaSize.width - w
      walkDx  = -Math.abs(walkDx)
      flipped = true
    }

    safeSetPosition(nextX, y)

    if (flipped && win && !win.isDestroyed()) {
      win.webContents.send('walk-direction', walkDx)
    }
  }, 40)
}

function stopWalk() {
  if (walkInterval) clearInterval(walkInterval)
  walkInterval = null
  walkDx = 0
}

// ── App Bootstrap ─────────────────────────────────────────────────────────────

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus() }
  })

  app.whenReady().then(() => {
    // Register pet:// protocol
    protocol.handle('pet', (request) => {
      const urlStr = request.url.substring('pet://'.length)
      const parts  = urlStr.split('/')
      const petId  = parts[0]
      let   file   = parts[1]

      if (file === 'auto') {
        try {
          const jsonPath = path.join(__dirname, 'public', 'pets', petId, 'pet.json')
          const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
          file = json.spritesheetPath || 'spritesheet.webp'
        } catch (e) {
          file = 'spritesheet.webp'
        }
      }

      const petPath = path.join(__dirname, 'public', 'pets', petId, file)
      return net.fetch('file://' + petPath)
    })

    createTray()
    createWindow()

    // ── IPC: Pets ──────────────────────────────────────────────────────────
    ipcMain.handle('get-pets', () => {
      try {
        const petsDir = path.join(__dirname, 'public', 'pets')
        const dirs = fs.readdirSync(petsDir, { withFileTypes: true })
          .filter(d => d.isDirectory()).map(d => d.name)
        const pets = []
        for (const dir of dirs) {
          try {
            const json = JSON.parse(fs.readFileSync(path.join(petsDir, dir, 'pet.json'), 'utf8'))
            pets.push(json)
          } catch (e) {}
        }
        return pets
      } catch (e) { return [] }
    })

    // ── IPC: Walk ──────────────────────────────────────────────────────────
    ipcMain.on('walk-start', (_, dx) => startWalk(dx))
    ipcMain.on('walk-stop',  ()      => stopWalk())

    // ── IPC: Window controls ───────────────────────────────────────────────
    ipcMain.on('close-window',    () => { if (win) win.close() })
    ipcMain.on('minimize-window', () => { if (win) win.minimize() })
    ipcMain.on('maximize-window', () => {
      if (!win) return
      win.isMaximized() ? win.restore() : win.maximize()
    })
    ipcMain.on('set-window-size', (_event, w, h) => {
      safeSetSize(w, h)
      if (win && !win.isDestroyed()) win.center()
    })

    // ── IPC: Persistent Store ──────────────────────────────────────────────
    const storePath = path.join(app.getPath('userData'), 'companion-store.json')

    function readStore() {
      try {
        if (fs.existsSync(storePath)) return JSON.parse(fs.readFileSync(storePath, 'utf8'))
      } catch (e) {}
      return {}
    }

    function writeStore(data) {
      try { fs.writeFileSync(storePath, JSON.stringify(data, null, 2)) } catch (e) {}
    }

    ipcMain.handle('get-store', () => readStore())

    ipcMain.on('set-store', (_event, key, value) => {
      const data = readStore()
      data[key] = value
      writeStore(data)
    })

    ipcMain.handle('reset-store', () => {
      try { fs.unlinkSync(storePath) } catch (e) {}
      return true
    })

    // ── IPC: Pet Drag ──────────────────────────────────────────────────────
    ipcMain.on('pet-drag-start', (_e, offset) => {
      dragOffset = {
        x: Math.round(typeof offset?.x === 'number' ? offset.x : 0),
        y: Math.round(typeof offset?.y === 'number' ? offset.y : 0),
      }
      stopWalk() // stop auto-walk during manual drag
      if (dragTimer) clearInterval(dragTimer)
      dragTimer = setInterval(() => {
        if (!win || win.isDestroyed()) return
        const cursor = screen.getCursorScreenPoint()
        safeSetPosition(cursor.x - dragOffset.x, cursor.y - dragOffset.y)
      }, 16)
    })

    ipcMain.on('pet-drag-stop', () => {
      if (dragTimer) clearInterval(dragTimer)
      dragTimer = null
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  stopWalk()
  if (dragTimer) clearInterval(dragTimer)
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  stopWalk()
  if (dragTimer) clearInterval(dragTimer)
})


