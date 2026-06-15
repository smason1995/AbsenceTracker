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

export const SelectionSection = ({
    month = 0, setMonth,
    year, setYear
}) => {
    /* Gets List of month names for locale */
    const monthList = (() => {
        const locale = 'en-US';
        const format = 'long';
        return Array.from({ length: 12 }, (_, index) => {
            const date = new Date(2000, index, 1);
            return date.toLocaleString(locale, { month: format });
        });
    })();

    return (
        <>
            <div className="selection-section">
                <label>Month:</label>
                <select
                value={month}
                onChange={(ev) => setMonth(Number(ev.target.value))}>
                    {monthList.length === 0 ? (
                        <option>Error</option>
                    ) : (
                        monthList.map((monthString, index) => (
                            <option key={monthString} value={index}>{monthString}</option>
                        ))
                    )}
                </select>
                <label>Year:</label>
                <input
                type="number"
                value={year || ''} 
                placeholder="YYYY"
                onChange={(ev) => setYear(Number(ev.target.value))}/>
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