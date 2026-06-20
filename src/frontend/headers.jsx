import React, { use } from 'react';
import { useState, useEffect, useRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';

import { ManagementDialog } from './headers/management.jsx';
import { ValidationDialog } from './headers/validation.jsx';

import {
    TableRowAddIcon,
    TableRowDeleteIcon,
    CheckmarkIcon,
    DismissIcon
} from './icons.jsx';

/* EXPORTS */

export const ExportSection = () => {
    return (
        <>
            <div className="export-section">
                <button>Export Data</button>
            </div>
        </>
    )
};

/* PERIOD SELECTION */

export const SelectionSection = ({
    month = 0, setMonth,
    year, setYear
}) => {
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
                    onChange={(ev) => setYear(Number(ev.target.value))} />
            </div>
        </>
    )
};

/* SETTINGS */

export const SettingsSection = ({
    employees = [], setEmployees,
    sites = [], setSites,
    certs = [], setCerts,
    types = [], setTypes
}) => {
    return (
        <div className="settings-section">
            {/* Unified Radix Dialog for Settings Suite */}
            <ManagementDialog
                employees={employees} setEmployees={setEmployees}
                sites={sites} setSites={setSites}
            />

            <ValidationDialog />
        </div>
    )
};