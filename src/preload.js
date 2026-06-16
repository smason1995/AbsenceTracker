// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');

/* Expose DbService Methods */
contextBridge.exposeInMainWorld('api', {
    getAllTypes: () => ipcRenderer.invoke('db:get-all-types'),
    getActiveEmployees: () => ipcRenderer.invoke('db:get-active-employees'),
    getAbsenceTable: (month, year) => ipcRenderer.invoke('db:get-absence-table', month, year),
    getAbsenceDayDetails: (emplId, absDate) => ipcRenderer.invoke('db:get-absence-day-details', emplId, absDate),
    getActiveSites: () => ipcRenderer.invoke('db:get-active-sites'),
    insertAbsence: (newRecordJson) => ipcRenderer.invoke('db:insert-absence', newRecordJson),
    updateAbsence: (updatedRecordJson) => ipcRenderer.invoke('db:update-absence', updatedRecordJson),
    deleteAbsence: (deletedRecordId) => ipcRenderer.invoke('db-delete-absence', deletedRecordId),
});