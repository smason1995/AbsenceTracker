import React, { use } from 'react';
import {
    useState,
    useEffect
} from 'react';
import * as Popover from '@radix-ui/react-popover'

import {
    DownloadIcon,
    TableRowDeleteIcon,
    TableRowAddIcon,
    CheckmarkIcon,
    DismissIcon
} from './icons.jsx';

function AbsenceDayDetails({ row, day, month, year }) {
    const [types, setTypes] = useState([]);
    const [sites, setSites] = useState([]);
    const [existingData, setExistingData] = useState([]);
    const [activeCommentDraft, setActiveCommentDraft] = useState({ index: null, text: "" });
    let newData = [];
    let deletedIds = [];

    useEffect(() => {
        window.api.getAllTypes()
            .then((data) => setTypes(data || []))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));

        window.api.getActiveSites()
            .then((data) => setSites(data || []))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));

        const cellDate = `${year}-${String(month + 1).padStart(2, '0')}-${day}`;
        window.api.getAbsenceDayDetails(row.employee_key, cellDate)
            .then((data) => setExistingData(data || []))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));
    }, []);

    const handleRowValueChange = (rowIndex, columnField, newValue) => {
        setExistingData((prevData) => {
            const updatedRows = [...prevData];
            updatedRows[rowIndex] = {
                ...updatedRows[rowIndex],
                [columnField]: newValue
            };
            return updatedRows;
        });
    };

    const commitCommentChange = (rowIndex) => {
        if (activeCommentDraft.index === rowIndex) {
            handleRowValueChange(rowIndex, 'comment', activeCommentDraft.text);
            // Reset state trackers
            setActiveCommentDraft({ index: null, text: "" });
        }
    };

    const handleRowAdd = (rowIndex) => {
        const newRecordTemplate = {
            // Essential unique identifier for the frontend virtual DOM mapping
            runtime_key: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,

            id: null,          // Differentiates it as a non-saved record to the backend API
            type_code: '',     // Blank initial select state
            minutes: '',       // Blank minutes field
            comment: '',       // Blank comment field
            name: '',          // Blank site name selection
            time: ''           // Blank time field
        };

        // Update your state array reference immutably
        setExistingData((prevData) => [...prevData, newRecordTemplate]);
    }

    const handleRowDelete = (rowIndex) => {
        const rowToDelete = existingData[rowIndex];

        if (rowToDelete && rowToDelete.id) {
            deletedIds.push(rowToDelete.id);
        }

        setExistingData((prevData) => {
            return prevData.filter((_, index) => index !== rowIndex);
        })
    }

    return (
        <div className="popover-body">
            <div className="popover-meta">
                <strong>{row.employee_id} - {row.employee_name}</strong>
                <span className="popover-date-badge">Day {day}</span>
            </div>
            <div className="popover-comment-text">
                {/*{row.absence_comments || 'No details recorded.'}*/}
                <div className="matrix-table-scroll-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Minutes</th>
                                <th>Comment</th>
                                <th>Site</th>
                                <th>Time</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {existingData.length > 0 &&
                                existingData.map((dataRow, index) => {
                                    console.log(JSON.stringify(dataRow))
                                    return (
                                        <tr key={dataRow.id || index}>
                                            <td>
                                                <select
                                                    value={dataRow.type_code || ''}
                                                    onChange={(ev) => handleRowValueChange(index, 'type_code', ev.target.value)}
                                                >
                                                    <option></option>
                                                    {types.length > 0 &&
                                                        types.map((option) => (
                                                            <option
                                                                key={option.code}
                                                                value={option.code}
                                                            >
                                                                {option.description}
                                                            </option>
                                                        ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    disabled={dataRow.type_code !== 'T'}
                                                />
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Popover.Root
                                                        onOpenChange={(open) => {
                                                            if (open) {
                                                                // Initialize draft buffer with current record state when popover opens
                                                                setActiveCommentDraft({ index, text: dataRow.comment || '' });
                                                            } else {
                                                                // Fallback protection: Commit changes if they click outside to close
                                                                commitCommentChange(index);
                                                            }
                                                        }}
                                                    >
                                                        <Popover.Trigger asChild>
                                                            <button
                                                                type="button"
                                                                title={dataRow.comment ? dataRow.comment : "Add comment"}
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    padding: '4px',
                                                                    height: 'auto',
                                                                    margin: 0,
                                                                    color: dataRow.comment ? '#0078d4' : 'var(--text-muted)'
                                                                }}
                                                            >
                                                                {dataRow.comment ? <CheckmarkIcon size={24} /> : <DismissIcon size={24} />}
                                                            </button>
                                                        </Popover.Trigger>

                                                        <Popover.Portal>
                                                            <Popover.Content
                                                                className="matrix-popover-content comment-popover"
                                                                side="bottom"
                                                                align="center"
                                                                sideOffset={4}
                                                            >
                                                                <textarea
                                                                    placeholder="Type row details or comments..."
                                                                    /* Bind to draft tracker text state instead of dataRow directly */
                                                                    value={activeCommentDraft.index === index ? activeCommentDraft.text : (dataRow.comment || '')}
                                                                    onChange={(ev) => setActiveCommentDraft({ index, text: ev.target.value })}
                                                                />
                                                                <Popover.Close asChild>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => commitCommentChange(index)}
                                                                        style={{ height: '22px', fontSize: '11px', alignSelf: 'flex-end' }}
                                                                    >
                                                                        Done
                                                                    </button>
                                                                </Popover.Close>
                                                            </Popover.Content>
                                                        </Popover.Portal>
                                                    </Popover.Root>
                                                </div>
                                            </td>
                                            <td>
                                                <select
                                                    value={dataRow.name || ''}
                                                    onChange={(ev) => handleRowValueChange(index, 'name', ev.target.value)}
                                                >
                                                    <option></option>
                                                    {sites.length > 0 &&
                                                        sites.map((option) => (
                                                            <option
                                                                key={option.name}
                                                                value={option.name}
                                                            >
                                                                {option.name}
                                                            </option>
                                                        ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="time"
                                                    value={dataRow.time}
                                                    onChange={(ev) => handleRowValueChange(index, 'time', ev.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRowDelete(index)}
                                                    title="Delete absence from table"
                                                >
                                                    <TableRowDeleteIcon size={24} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                        </tbody>
                    </table>
                </div>
                <div className="popover-site-info">
                    <button
                        type="button"
                        onClick={handleRowAdd}
                        title="Add new absence"
                    >
                        <TableRowAddIcon size={24} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export const EmployeeDataSection = ({
    absenceTableJson = [], setAbsenceTableJson,
    month, year
}) => {
    const [tableDataJson, setTableDataJson] = useState([]);
    const [daysInMonth, setDaysInMonth] = useState([]);

    useEffect(() => {
        window.api.getAbsenceTable(month + 1, year)
            .then((data) => setAbsenceTableJson(data))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));
        const totalDays = new Date(year, month + 1, 0).getDate();
        const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
        setDaysInMonth(daysArray);
    }, [month, year]);

    function TableData(tableData, daysArr) {
        return (
            <div className="matrix-table-scroll-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            {daysArr.map((day) => (
                                <th key={day}>{day}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.length === 0 ? (
                            <tr>
                                <td colSpan={daysArr + 1}>
                                    No active employee records found for this period.
                                </td>
                            </tr>
                        ) : (
                            tableData.map((row, index) => {
                                // 1. Build a lookup object for absence codes: { 13: "E", 14: "PI" }
                                const absenceMap = {};
                                if (row.absence_codes) {
                                    row.absence_codes.split('|').forEach(entry => {
                                        const parts = entry.split(':');
                                        if (parts.length === 2) {
                                            const dayKey = parseInt(parts[0], 10);
                                            const codeValue = parts[1];
                                            absenceMap[dayKey] = absenceMap[dayKey] ? `${absenceMap[dayKey]}|${codeValue}` : codeValue;
                                        }
                                    });
                                }

                                // 2. Build a lookup object for comments: { 13: "Left early, no notice", 14: "Possible woohoo..." }
                                const commentMap = {};
                                if (row.absence_comments) {
                                    row.absence_comments.split('|').forEach(entry => {
                                        const parts = entry.split(':');
                                        if (parts.length === 2) {
                                            const dayKey = parseInt(parts[0], 10);
                                            const commentValue = parts[1];
                                            commentMap[dayKey] = commentMap[dayKey] ? `${commentMap[dayKey]} | ${commentValue}` : commentValue;
                                        }
                                    });
                                }

                                return (
                                    <tr key={row.employee_key || row.employee_id || index}>
                                        <td>{row.employee_name}</td>
                                        {daysArr.map((day) => {
                                            const cellCode = absenceMap[day] || '';
                                            const cellComment = commentMap[day] || ''; // Extract text for this specific cell date
                                            const isAbsenceDay = cellCode !== '';

                                            return (
                                                <Popover.Root key={day}>
                                                    <Popover.Trigger asChild>
                                                        {/* 3. Re-inject the title attribute for hover tooltips! */}
                                                        <td
                                                            className={`matrix-data-cell ${isAbsenceDay ? 'has-absence' : ''}`}
                                                            title={isAbsenceDay && cellComment ? cellComment : undefined}
                                                        >
                                                            {cellCode}
                                                        </td>
                                                    </Popover.Trigger>
                                                    <Popover.Portal>
                                                        <Popover.Content
                                                            className="matrix-popover-content"
                                                            side="top"
                                                            sideOffset={6}
                                                            align="center"
                                                        >
                                                            <div className="popover-accent-bar" />

                                                            <AbsenceDayDetails
                                                                row={row}
                                                                day={day}
                                                                month={month}
                                                                year={year}
                                                            />

                                                            <Popover.Arrow className="matrix-popover-arrow" />
                                                        </Popover.Content>
                                                    </Popover.Portal>
                                                </Popover.Root>
                                            );
                                        })}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        )
    }

    return (
        <>
            <div className="employee-data-section">
                <button className="download-button">
                    <DownloadIcon size={24} />
                </button>
                {TableData(absenceTableJson, daysInMonth)}
            </div>
        </>
    )
};

export const EmployeeSummarySection = () => {
    return (
        <>
            <div className="employee-summary-section">
                <button className="download-button">
                    <DownloadIcon size={24} />
                </button>
                TODO: Insert Employee Summary Table
            </div>
        </>
    )
};

export const TypesDailySummarySection = () => {
    return (
        <>
            <div className="types-daily-summary-section">
                <button className="download-button">
                    <DownloadIcon size={24} />
                </button>
                TODO: Insert Types Daily Table
            </div>
        </>
    )
};

export const TypesMonthlySummarySection = () => {
    return (
        <>
            <div className="types-monthly-summary-section">
                <button className="download-button">
                    <DownloadIcon size={24} />
                </button>
                TODO: Insert Types Monthly Table
            </div>
        </>
    )
};