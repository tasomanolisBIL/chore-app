'use strict'

const { app, BrowserWindow, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const net = require('net')
const { pathToFileURL } = require('url')

// Tell the server where to store the SQLite database (persists across app updates)
process.env.USER_DATA_PATH = app.getPath('userData')
process.env.NODE_ENV = 'production'
process.env.PORT = '3001'

let mainWindow

/** Poll until Express is accepting connections, then call cb() */
function waitForServer(port, cb, attempts = 0) {
  const sock = new net.Socket()
  sock.connect(port, '127.0.0.1', () => {
    sock.destroy()
    cb()
  })
  sock.on('error', () => {
    sock.destroy()
    if (attempts > 50) {
      dialog.showErrorBox(
        'Startup failed',
        'The local server could not start.\nPlease restart the app.'
      )
      app.quit()
      return
    }
    setTimeout(() => waitForServer(port, cb, attempts + 1), 200)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Chore App',
    show: false,
    backgroundColor: '#0f172a',
  })

  mainWindow.loadURL('http://localhost:3001')
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  // Hide the default menu bar
  mainWindow.setMenuBarVisibility(false)
}

app.whenReady().then(async () => {
  // Dynamically import the ESM Express server
  const serverEntry = path.join(__dirname, '..', 'server', 'index.js')
  await import(pathToFileURL(serverEntry).href)

  // Wait until Express is ready, then open the window
  waitForServer(3001, () => {
    createWindow()
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ── Auto-updater notifications ────────────────────────────────────────────────

autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update available',
    message: 'A new version is downloading in the background.',
    buttons: ['OK'],
  })
})

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update ready',
    message: 'Update downloaded. Restart now to apply it?',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall()
  })
})
