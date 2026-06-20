// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');

/* Expose DbService Methods */
contextBridge.exposeInMainWorld('api', {
    getAllTypes: () => ipcRenderer.invoke('db:get-all-types'),
    getAllCerts: () => ipcRenderer.invoke('db:get-all-certs'),
    getAllSites: () => ipcRenderer.invoke('db:get-all-sites'),
    getAllEmployees: () => ipcRenderer.invoke('db:get-all-employees'),

    getActiveEmployees: () => ipcRenderer.invoke('db:get-active-employees'),
    getAbsenceTable: (month, year) => ipcRenderer.invoke('db:get-absence-table', month, year),
    getAbsenceDayDetails: (emplId, absDate) => ipcRenderer.invoke('db:get-absence-day-details', emplId, absDate),
    getActiveSites: () => ipcRenderer.invoke('db:get-active-sites'),
    getAbsenceHighlight: (queryJson) => ipcRenderer.invoke('db:get-absence-highlight', queryJson),

    insertAbsence: (newRecordJson) => ipcRenderer.invoke('db:insert-absence', newRecordJson),
    insertEmployee: (newRecordJson) => ipcRenderer.invoke('db:insert-employee', newRecordJson),
    insertEmployeeCert: (newRecordJson) => ipcRenderer.invoke('db:insert-employee-cert', newRecordJson),
    insertSite: (newRecordJson) => ipcRenderer.invoke('db:insert-site', newRecordJson),
    insertCert: (newRecordJson) => ipcRenderer.invoke('db:insert-cert', newRecordJson),
    insertType: (newRecordJson) => ipcRenderer.invoke('db:insert-type', newRecordJson),

    updateAbsence: (updatedRecordJson) => ipcRenderer.invoke('db:update-absence', updatedRecordJson),
    updateEmployee: (updatedRecordJson) => ipcRenderer.invoke('db:update-employee', updatedRecordJson),
    updateEmployeeCert: (updatedRecordJson) => ipcRenderer.invoke('db:update-employee-cert', updatedRecordJson),
    updateSite: (updatedRecordJson) => ipcRenderer.invoke('db:update-site', updatedRecordJson),

    deleteAbsence: (deletedRecordId) => ipcRenderer.invoke('db-delete-absence', deletedRecordId),
});