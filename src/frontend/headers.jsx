import React from 'react';

export const ExportSection = () => {
    return (
        <>
            <div className="export-section">
                <button>Export Data</button>
            </div>
        </>
    )
};

export const SelectionSection = () => {
    return (
        <>
            <div className="selection-section">
                <label>Month:</label>
                <select>
                    <option>TODO</option>
                </select>
                <label>Year:</label>
                <input/>
            </div>
        </>
    )
};

export const SettingsSection = () => {
    return (
        <>
            <div className="settings-section">
                <button>Employees</button>
                <button>Sites</button>
                <button>Types</button>
            </div>
        </>
    )
};