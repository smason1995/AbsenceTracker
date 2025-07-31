import { app, BrowserWindow, Menu } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'assets', 'favicon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  })

  const indexPath = path.join(__dirname, 'dist', 'index.html')
  //win.loadURL('http://localhost:5173')
  //win.loadURL('http://localhost:3000')
  //console.log(indexPath)
  //console.log('Loading index file from:', indexPath)
  //console.log('Current directory:', __dirname)
  win.loadFile(indexPath)
}

Menu.setApplicationMenu(null) // Disable the default menu; comment out if you want the default menu

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})