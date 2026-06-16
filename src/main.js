const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

import { DbService } from './backend/dbservice.js';

let dbService;
try {
  dbService = new DbService();
} catch (error) {
  console.error(`Critical: Failed to start DB Service: ${error}`);
}

// IPC Listeners mapping the preload triggers to the class methods
ipcMain.handle('db:get-all-types', () => {
  return dbService.getAllTypes();
});

ipcMain.handle('db:get-active-employees', () => {
  return dbService.getActiveEmployees();
});

ipcMain.handle('db:get-absence-table', (event, month, year) => {
  return dbService.getAbsenceTable(month, year);
});

ipcMain.handle('db:get-absence-day-details', (event, emplId, absDate) => {
  return dbService.getAbsenceDayDetails(emplId, absDate);
});

ipcMain.handle('db:get-active-sites', () => {
  return dbService.getActiveSites();
});

ipcMain.handle('db:insert-absence', (event, newRecordJson) => {
  return dbService.insertAbsence(newRecordJson);
});

ipcMain.handle('db:update-absence', (event, updatedRecordJson) => {
  return dbService.updateAbsence(updatedRecordJson);
});

ipcMain.handle('db-delete-absence', (event, deletedRecordId) => {
  return dbService.deleteAbsence(deletedRecordId);
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
