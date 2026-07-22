import React from 'react';
import {
    useState,
    useEffect,
    useRef,
    useMemo
} from 'react';
import * as Popover from '@radix-ui/react-popover';

import {
    DownloadIcon,
    TableRowDeleteIcon,
    TableRowAddIcon,
    CheckmarkIcon,
    DismissIcon
} from './icons.jsx';

function AbsenceDayDetails({ row, day, month, year, onSaveComplete }) {
    const [types, setTypes] = useState([]);
    const [sites, setSites] = useState([]);
    const [existingData, setExistingData] = useState([]);
    const [activeCommentDraft, setActiveCommentDraft] = useState({ index: null, text: "" });

    const deletedIdsRef = useRef([]);

    const syncRef = useRef({ existingData, deletedIds: [] });

    useEffect(() => {
        syncRef.current = { existingData, deletedIds: deletedIdsRef.current };
    }, [existingData])

    useEffect(() => {
        window.api.getAllTypes()
            .then((data) => setTypes(data || []))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));

        window.api.getActiveSites()
            .then((data) => setSites(data || []))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));

        const cellDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        window.api.getAbsenceDayDetails(row.employee_key, cellDate)
            .then((data) => setExistingData(data || []))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));

        return () => {
            const finalData = syncRef.current.existingData;
            const finalDeletes = syncRef.current.deletedIds;

            const itemsToInsert = finalData.filter(row => row.isNew && row.type_code);
            const itemsToUpdate = finalData.filter(row => row.id && row.isDirty);

            if (itemsToInsert.length === 0 && itemsToUpdate.length === 0 && finalDeletes.length === 0) {
                return;
            }

            const targetMonthStr = String(month + 1).padStart(2, '0');
            const targetDayStr = String(day).padStart(2, '0');
            const cellDateStr = `${year}-${targetMonthStr}-${targetDayStr}`;

            const dbOperationsQueue = [];

            itemsToInsert.forEach((json) => {
                const finalJson = {
                    ...json,
                    employee_key: row.employee_key,
                    date: cellDateStr
                };

                dbOperationsQueue.push(
                    window.api.insertAbsence(finalJson)
                        .catch((error) => console.error(`Database IPC retrieval failure: ${error}`))
                );

            });

            itemsToUpdate.forEach((json) => {
                const finalJson = {
                    ...json,
                    employee_key: row.employee_key,
                    date: cellDateStr
                };

                dbOperationsQueue.push(
                    window.api.updateAbsence(finalJson)
                        .catch((error) => console.error(`Database IPC retrieval failure: ${error}`))
                );
            });

            finalDeletes.forEach((id) => {
                dbOperationsQueue.push(
                    window.api.deleteAbsence(id)
                        .catch((error) => console.error(`Database IPC retrieval failure: ${error}`))
                );
            });

            if (dbOperationsQueue.length > 0) {
                Promise.all(dbOperationsQueue).then(() => {
                    if (typeof onSaveComplete === 'function') {
                        onSaveComplete();
                    }
                })
            }
        }
    }, []);

    const handleRowValueChange = (rowIndex, columnField, newValue) => {
        setExistingData((prevData) => {
            const updatedRows = [...prevData];
            const targetRow = updatedRows[rowIndex];
            updatedRows[rowIndex] = {
                ...updatedRows[rowIndex],
                [columnField]: newValue,
                isDirty: targetRow.id ? true : targetRow.isDirty
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
            time: '',          // Blank time field
            isNew: true        // flag to identify new rows for INSERT
        };

        // Update your state array reference immutably
        setExistingData((prevData) => [...prevData, newRecordTemplate]);
    }

    const handleRowDelete = (rowIndex) => {
        const rowToDelete = existingData[rowIndex];

        if (rowToDelete && rowToDelete.id) {
            if (!deletedIdsRef.current.includes(rowToDelete.id)) {
                deletedIdsRef.current.push(rowToDelete.id);
            }
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
                <div
                    className="matrix-table-scroll-wrapper"
                    style={existingData.length > 5 ? { maxHeight: '235px', overflowY: 'auto' } : {}}
                >
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
                                                    value={dataRow.minutes ?? ''}
                                                    onChange={(ev) => handleRowValueChange(index, 'minutes', ev.target.value)}
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
    month, year,
    employees
}) => {
    const [tableDataJson, setTableDataJson] = useState([]);
    const [daysInMonth, setDaysInMonth] = useState([]);
    // Minimal change: Changed initial state pattern to an object map for instant lookups
    const [highlightedCells, setHighlightedCells] = useState({});
    const [exportClickCount, setExportClickCount] = useState(0);
    const [savePath, setSavePath] = useState(null);

    const refreshTableData = () => {
        window.api.getAbsenceTable(month + 1, year)
            .then((data) => setAbsenceTableJson(data))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));
    };

    useEffect(() => {
        // Backup default path
        window.api.getExportPath()
            .then((path) => {
                setSavePath(path);
            })
            .catch((error) => console.error(`Failed to retrieve export path: ${error}`));
    }, []);

    useEffect(() => {
        refreshTableData();

        const totalDays = new Date(year, month + 1, 0).getDate();
        const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
        setDaysInMonth(daysArray);
    }, [month, year, employees]);

    // Added: Secondary independent listener to fetch cell highlights safely across the wire
    useEffect(() => {
        if (!absenceTableJson.length || !daysInMonth.length) return;

        let isCurrentBatch = true;
        const lookupMap = {};

        // Queue concurrent IPC query tasks for each active grid block coordinate
        const promises = absenceTableJson.flatMap((row, index) => {
            const empId = row.employee_key;

            return daysInMonth.map((day) => {
                const cellDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                return window.api.getAbsenceHighlight({ id: empId, date: cellDate, count: 3 })
                    .then((resultRow) => {
                        if (resultRow && isCurrentBatch) {
                            lookupMap[`${empId}-${day}`] = true;
                        }
                    })
                    .catch((err) => console.error(`Highlight check error: ${err}`));
            });
        });

        Promise.all(promises).then(() => {
            if (isCurrentBatch) setHighlightedCells(lookupMap);
        });

        return () => { isCurrentBatch = false; };
    }, [absenceTableJson, daysInMonth, month, year]);

    // useEffect to handle grabbing the table data from UI for export
    useEffect(() => {
        if (exportClickCount > 0) {

            const executeExport = async () => {
                try {
                    // 1. [Synchronous] Setup baseline metadata
                    const tableExportJson = {
                        meta: {
                            month: month,
                            year: year
                        }
                    };

                    // 2. [Synchronous] Get HTML Table from DOM
                    const tableElement = document.querySelector('.matrix-table-scroll-wrapper table#employee-data-table');
                    if (!tableElement) {
                        throw new Error("Target matrix HTML table could not be found in the DOM.");
                    }

                    // 3. [Synchronous] Extract Table Headers and Rows
                    const tableData = [];
                    const headers = Array.from(tableElement.querySelectorAll('thead th')).map(th => th.textContent.trim());
                    const rows = tableElement.querySelectorAll('tbody tr');

                    // 4. [Synchronous] Iterate over each row and extract cell data
                    rows.forEach(row => {
                        const rowData = {};
                        const cells = row.querySelectorAll('td');
                        cells.forEach((cell, index) => {
                            const header = headers[index];
                            if (header === 'Name') {
                                rowData[header] = cell.textContent.trim();
                            } else {
                                rowData[header] = {
                                    text: cell.textContent.trim(),
                                    highlight: cell.classList.contains('has-absence') ? 1 : 0
                                };
                            }
                        });
                        tableData.push(rowData);
                    });

                    // Add your scraped data to your meta object if your service needs it combined:
                    tableExportJson.data = tableData;
                    console.log("Export JSON payload prepared:", JSON.stringify(tableExportJson));

                    // 5. [Asynchronous] Request the export service to generate the Excel file
                    const startPath = await window.api.getExportPath();

                    const defaultPath = await window.api.getDefaultPath((startPath ? startPath : savePath), `Absence_Table_Export_${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}.xlsx`);

                    const path = await window.api.saveFilePicker({
                        title: 'Select Save Location for Employee Report',
                        defaultPath: defaultPath,
                        buttonLabel: 'Save Report',
                        filters: [
                            { name: 'Excel Files', extensions: ['xlsx'] },
                            { name: 'All Files', extensions: ['*'] }
                        ]
                    })

                    const exportResult = await window.api.generateAbsenceMatrixReport(tableExportJson);

                    if (exportResult.success) {
                        console.log(`Report successfully exported to: ${exportResult.message}`);
                    } else {
                        console.error(`Error exporting report: ${exportResult.message}`);
                    }

                } catch (error) {
                    // Any DOM scraping exceptions or IPC rejections land safely here!
                    console.error(`Failed to execute export pipeline: ${error.message}`);
                }
            };

            executeExport();
        }
    }, [exportClickCount]);

    function TableData(tableData, daysArr) {
        return (
            <div className="matrix-table-scroll-wrapper">
                <table id="employee-data-table">
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
                                const empKey = row.employee_key || row.employee_id || index;

                                // 1. Build a lookup object for absence codes
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

                                // 2. Build a lookup object for comments
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
                                    <tr key={empKey}>
                                        <td>{row.employee_name}</td>
                                        {daysArr.map((day) => {
                                            const cellCode = absenceMap[day] || '';
                                            const cellComment = commentMap[day] || '';
                                            const isAbsenceDay = cellCode !== '';

                                            // Added: Direct synchronous state verification
                                            const isHighlighted = !!highlightedCells[`${empKey}-${day}`];

                                            const highlight = isAbsenceDay && isHighlighted;

                                            return (
                                                <Popover.Root key={day}>
                                                    <Popover.Trigger asChild>
                                                        {/* Minimal change: Conditional injection of the alert highlight class */}
                                                        <td
                                                            className={`matrix-data-cell ${highlight ? 'has-absence' : ''}`}
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
                                                                onSaveComplete={refreshTableData}
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
                <button
                    className="download-button"
                    onClick={() => setExportClickCount(exportClickCount + 1)}
                >
                    <DownloadIcon size={24} />
                </button>
                {TableData(absenceTableJson, daysInMonth)}
            </div>
        </>
    )
};

export const EmployeeSummarySection = ({
    absenceTableJson = [],
    month, year
}) => {
    const [tableData, setTableData] = useState([]);
    const [typeList, setTypeList] = useState([]);
    const [exportClickCount, setExportClickCount] = useState(0);
    const [savePath, setSavePath] = useState(null);

    useEffect(() => {
        // Backup default path
        window.api.getExportPath()
            .then((path) => {
                setSavePath(path);
            })
            .catch((error) => console.error(`Failed to retrieve export path: ${error}`));
    }, []);

    useEffect(() => {
        // Safe check to prevent NaN query payload drops
        if (month === undefined || year === undefined) return;

        window.api.getEmployeeSummary(month + 1, year)
            .then((data) => setTableData(data || [])) // Fallback wrapper protection
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));

        window.api.getAllTypes()
            .then((data) => setTypeList(data || []))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));
    }, [absenceTableJson, month, year]);

    // useEffect to handle grabbing the table data from UI for export
    useEffect(() => {
        if (exportClickCount > 0) {

            const executeExport = async () => {
                try {
                    // 1. [Synchronous] Setup baseline metadata
                    const tableExportJson = {
                        meta: {
                            month: month,
                            year: year
                        }
                    };

                    // 2. [Synchronous] Get HTML Table from DOM
                    const tableElement = document.querySelector('.matrix-table-scroll-wrapper table#employee-summary-table');
                    if (!tableElement) {
                        throw new Error("Target matrix HTML table could not be found in the DOM.");
                    }

                    // 3. [Synchronous] Extract Table Headers and Rows
                    const tableData = [];
                    const headers = Array.from(tableElement.querySelectorAll('thead th')).map(th => th.textContent.trim());
                    const rows = tableElement.querySelectorAll('tbody tr');

                    // 4. [Synchronous] Iterate over each row and extract cell data
                    rows.forEach(row => {
                        const rowData = {};
                        const cells = row.querySelectorAll('td');
                        cells.forEach((cell, index) => {
                            const cellText = cell.textContent.trim()
                            const header = headers[index];
                            if (header === 'Name') {
                                rowData[header] = cellText;
                            } else {
                                rowData[header] = {
                                    text: cellText === '-' ? '' : cellText,
                                    highlight: cell.classList.contains('has-absence') ? 1 : 0
                                };
                            }
                        });
                        tableData.push(rowData);
                    });

                    // Add your scraped data to your meta object if your service needs it combined:
                    tableExportJson.data = tableData;
                    console.log("Export JSON payload prepared:", JSON.stringify(tableExportJson));

                    // // 5. [Asynchronous] Request the export service to generate the Excel file
                    // const startPath = await window.api.getExportPath();

                    // const defaultPath = await window.api.getDefaultPath((startPath ? startPath : savePath), `Absence_Table_Export_${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}.xlsx`);

                    // const path = await window.api.saveFilePicker({
                    //     title: 'Select Save Location for Employee Report',
                    //     defaultPath: defaultPath,
                    //     buttonLabel: 'Save Report',
                    //     filters: [
                    //         { name: 'Excel Files', extensions: ['xlsx'] },
                    //         { name: 'All Files', extensions: ['*'] }
                    //     ]
                    // })

                    // const exportResult = await window.api.generateAbsenceMatrixReport(tableExportJson);

                    // if (exportResult.success) {
                    //     console.log(`Report successfully exported to: ${exportResult.message}`);
                    // } else {
                    //     console.error(`Error exporting report: ${exportResult.message}`);
                    // }

                } catch (error) {
                    // Any DOM scraping exceptions or IPC rejections land safely here!
                    console.error(`Failed to execute export pipeline: ${error.message}`);
                }
            };

            executeExport();
        }
    }, [exportClickCount]);

    const groupedTableRows = useMemo(() => {
        const employeeMap = {};
        const cleanTableData = Array.isArray(tableData) ? tableData : [];

        cleanTableData.forEach((row) => {
            const key = row.employee_key;

            if (!employeeMap[key]) {
                employeeMap[key] = {
                    employee_key: key,
                    employee_name: row.employee_name,
                    typeCounts: {}
                };
            }

            if (row.type_code) {
                employeeMap[key].typeCounts[row.type_code] = row.count;
            }
        });

        // FIX: Explicitly sort alphabetically by name to bypass JS object key re-ordering quirks
        return Object.values(employeeMap).sort((a, b) => {
            return a.employee_name.localeCompare(b.employee_name, undefined, { sensitivity: 'base' });
        });
    }, [tableData]);

    return (
        <>
            <div className="employee-summary-section">
                <button
                    className="download-button"
                    onClick={() => setExportClickCount(exportClickCount + 1)}
                >
                    <DownloadIcon size={24} />
                </button>
                <div className="matrix-table-scroll-wrapper">
                    <table id="employee-summary-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                {typeList.length > 0 &&
                                    typeList.map((headRow, index) => {
                                        return (
                                            <th key={headRow.code || index}>{headRow.code}</th>
                                        )
                                    })}
                            </tr>
                        </thead>
                        <tbody>
                            {groupedTableRows.length === 0 ? (
                                <tr>
                                    <td colSpan={typeList.length + 1}>
                                        No active summary tracking information found.
                                    </td>
                                </tr>
                            ) : (
                                groupedTableRows.map((empRow) => {
                                    return (
                                        <tr key={empRow.employee_key}>
                                            <td className="employee-name-cell">
                                                {empRow.employee_name}
                                            </td>
                                            {typeList.map((typeCategory, index) => {
                                                const typeIdentifier = typeCategory.code || typeCategory.type_code;

                                                // Instantly read aggregate values out of local mapping object
                                                const countValue = empRow.typeCounts[typeIdentifier] || 0;

                                                return (
                                                    <td
                                                        key={typeIdentifier || index}
                                                        style={{ textAlign: 'center' }}
                                                        className={countValue > 0 ? 'has-summary-count' : 'empty-count'}
                                                    >
                                                        {countValue > 0 ? countValue : '-'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
};

export const TypesDailySummarySection = ({
    absenceTableJson = [],
    month, year
}) => {
    const [tableData, setTableData] = useState([]);
    const [daysInMonth, setDaysInMonth] = useState([]);
    const [exportClickCount, setExportClickCount] = useState(0);
    const [savePath, setSavePath] = useState(null);

    useEffect(() => {
        // Backup default path
        window.api.getExportPath()
            .then((path) => {
                setSavePath(path);
            })
            .catch((error) => console.error(`Failed to retrieve export path: ${error}`));
    }, []);
    
    useEffect(() => {
        // Prevent calling if dates are uninitialized
        if (month === undefined || year === undefined) return;

        window.api.getTypeDailySummary(month + 1, year)
            .then((data) => setTableData(data || [])) // Defensive fallback wrapper
            .catch((error) => {
                console.error(`Database IPC retrieval failure: ${error}`);
                setTableData([]);
            });

        const totalDays = new Date(year, month + 1, 0).getDate();
        const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
        setDaysInMonth(daysArray);
    }, [absenceTableJson, month, year]);

    // useEffect to handle grabbing the table data from UI for export
    useEffect(() => {
        if (exportClickCount > 0) {

            const executeExport = async () => {
                try {
                    // 1. [Synchronous] Setup baseline metadata
                    const tableExportJson = {
                        meta: {
                            month: month,
                            year: year
                        }
                    };

                    // 2. [Synchronous] Get HTML Table from DOM
                    const tableElement = document.querySelector('.matrix-table-scroll-wrapper table#types-daily-table');
                    if (!tableElement) {
                        throw new Error("Target matrix HTML table could not be found in the DOM.");
                    }

                    // 3. [Synchronous] Extract Table Headers and Rows
                    const tableData = [];
                    const headers = Array.from(tableElement.querySelectorAll('thead th')).map(th => th.textContent.trim());
                    const rows = tableElement.querySelectorAll('tbody tr');

                    // 4. [Synchronous] Iterate over each row and extract cell data
                    rows.forEach(row => {
                        const rowData = {};
                        const cells = row.querySelectorAll('td');
                        cells.forEach((cell, index) => {
                            const cellText = cell.textContent.trim()
                            const header = headers[index];
                            if (header === 'Absence Type') {
                                rowData[header] = cellText;
                            } else {
                                rowData[header] = {
                                    text: cellText === '-' ? '' : cellText,
                                    highlight: cell.classList.contains('has-absence') ? 1 : 0
                                };
                            }
                        });
                        tableData.push(rowData);
                    });

                    // Add your scraped data to your meta object if your service needs it combined:
                    tableExportJson.data = tableData;
                    console.log("Export JSON payload prepared:", JSON.stringify(tableExportJson));

                    // 5. [Asynchronous] Request the export service to generate the Excel file
                    const startPath = await window.api.getExportPath();

                    const defaultPath = await window.api.getDefaultPath((startPath ? startPath : savePath), `Types_Daily_Table_Export_${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}.xlsx`);

                    const path = await window.api.saveFilePicker({
                        title: 'Select Save Location for Employee Report',
                        defaultPath: defaultPath,
                        buttonLabel: 'Save Report',
                        filters: [
                            { name: 'Excel Files', extensions: ['xlsx'] },
                            { name: 'All Files', extensions: ['*'] }
                        ]
                    })

                    const exportResult = await window.api.generateTypesDailyMatrixReport(tableExportJson);

                    if (exportResult.success) {
                        console.log(`Report successfully exported to: ${exportResult.message}`);
                    } else {
                        console.error(`Error exporting report: ${exportResult.message}`);
                    }

                } catch (error) {
                    // Any DOM scraping exceptions or IPC rejections land safely here!
                    console.error(`Failed to execute export pipeline: ${error.message}`);
                }
            };

            executeExport();
        }
    }, [exportClickCount]);

    // Pivot flat query data into a fast O(1) keyed lookup map
    const pivotedRows = useMemo(() => {
        const cleanTableData = Array.isArray(tableData) ? tableData : [];
        const typeMap = {};

        cleanTableData.forEach((row) => {
            const key = row.code;

            if (!typeMap[key]) {
                typeMap[key] = {
                    code: row.code,
                    description: row.description,
                    dailyCounts: {} // Indexed lookup: { 1: count, 15: count }
                };
            }

            // Parse 'YYYY-MM-DD' down to just the day integer
            if (row.date) {
                const dayNum = parseInt(row.date.split('-')[2], 10);
                typeMap[key].dailyCounts[dayNum] = row.count;
            }
        });

        // Alphabetize the output matrix rows by the type code designation
        return Object.values(typeMap).sort((a, b) => a.code.localeCompare(b.code));
    }, [tableData]);

    return (
        <>
            <div className="types-daily-summary-section">
                <button
                    className="download-button"
                    onClick={() => setExportClickCount(exportClickCount + 1)}
                >
                    <DownloadIcon size={24} />
                </button>
                <div className="matrix-table-scroll-wrapper">
                    <table id="types-daily-table">
                        <thead>
                            <tr>
                                <th>Absence Type</th>
                                {daysInMonth.length > 0 &&
                                    daysInMonth.map((day) => (
                                        // Fixed: Swapped to an implicit return statement
                                        <th key={day} style={{ minWidth: '30px', textAlign: 'center' }}>
                                            {day}
                                        </th>
                                    ))
                                }
                            </tr>
                        </thead>
                        <tbody>
                            {pivotedRows.length === 0 ? (
                                <tr>
                                    <td colSpan={daysInMonth.length + 1} style={{ textAlign: 'center', padding: '12px' }}>
                                        No tracking records recorded for this period.
                                    </td>
                                </tr>
                            ) : (
                                pivotedRows.map((typeRow) => (
                                    <tr key={typeRow.code}>
                                        <td className="type-description-cell" title={`${typeRow.code} - ${typeRow.description}`}>
                                            {typeRow.description}
                                        </td>
                                        {daysInMonth.map((day) => {
                                            const countValue = typeRow.dailyCounts[day] || 0;
                                            return (
                                                <td
                                                    key={day}
                                                    style={{ textAlign: 'center' }}
                                                    className={countValue > 0 ? 'has-summary-count' : 'empty-count'}
                                                >
                                                    {countValue > 0 ? countValue : '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
};

export const TypesMonthlySummarySection = ({
    absenceTableJson = [],
    month, year
}) => {
    const [tableData, setTableData] = useState([]);
    const [exportClickCount, setExportClickCount] = useState(0);
    const [savePath, setSavePath] = useState(null);

    useEffect(() => {
        // Backup default path
        window.api.getExportPath()
            .then((path) => {
                setSavePath(path);
            })
            .catch((error) => console.error(`Failed to retrieve export path: ${error}`));
    }, []);
    
    useEffect(() => {
        window.api.getTypeMonthlySummary(month + 1, year)
            .then((data) => setTableData(data))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));
    }, [absenceTableJson, month, year]);

    // useEffect to handle grabbing the table data from UI for export
    useEffect(() => {
        if (exportClickCount > 0) {

            const executeExport = async () => {
                try {
                    // 1. [Synchronous] Setup baseline metadata
                    const tableExportJson = {
                        meta: {
                            month: month,
                            year: year
                        }
                    };

                    // 2. [Synchronous] Get HTML Table from DOM
                    const tableElement = document.querySelector('.matrix-table-scroll-wrapper table#types-monthly-table');
                    if (!tableElement) {
                        throw new Error("Target matrix HTML table could not be found in the DOM.");
                    }

                    // 3. [Synchronous] Extract Table Headers and Rows
                    const tableData = [];
                    const headers = Array.from(tableElement.querySelectorAll('thead th')).map(th => th.textContent.trim());
                    const rows = tableElement.querySelectorAll('tbody tr');

                    // 4. [Synchronous] Iterate over each row and extract cell data
                    rows.forEach(row => {
                        const rowData = {};
                        const cells = row.querySelectorAll('td');
                        cells.forEach((cell, index) => {
                            const header = headers[index];
                            if (header === 'Name') {
                                rowData[header] = cell.textContent.trim();
                            } else {
                                rowData[header] = {
                                    text: cell.textContent.trim(),
                                    highlight: 0
                                };
                            }
                        });
                        tableData.push(rowData);
                    });

                    // Add your scraped data to your meta object if your service needs it combined:
                    tableExportJson.data = tableData;
                    console.log("Export JSON payload prepared:", JSON.stringify(tableExportJson));

                    // // 5. [Asynchronous] Request the export service to generate the Excel file
                    // const startPath = await window.api.getExportPath();

                    // const defaultPath = await window.api.getDefaultPath((startPath ? startPath : savePath), `Absence_Table_Export_${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}.xlsx`);

                    // const path = await window.api.saveFilePicker({
                    //     title: 'Select Save Location for Employee Report',
                    //     defaultPath: defaultPath,
                    //     buttonLabel: 'Save Report',
                    //     filters: [
                    //         { name: 'Excel Files', extensions: ['xlsx'] },
                    //         { name: 'All Files', extensions: ['*'] }
                    //     ]
                    // })

                    // const exportResult = await window.api.generateAbsenceMatrixReport(tableExportJson);

                    // if (exportResult.success) {
                    //     console.log(`Report successfully exported to: ${exportResult.message}`);
                    // } else {
                    //     console.error(`Error exporting report: ${exportResult.message}`);
                    // }

                } catch (error) {
                    // Any DOM scraping exceptions or IPC rejections land safely here!
                    console.error(`Failed to execute export pipeline: ${error.message}`);
                }
            };

            executeExport();
        }
    }, [exportClickCount]);

    return (
        <>
            <div className="types-monthly-summary-section">
                <button
                    className="download-button"
                    onClick={() => setExportClickCount(exportClickCount + 1)}
                >
                    <DownloadIcon size={24} />
                </button>
                <div className="matrix-table-scroll-wrapper">
                    <table id="types-monthly-table">
                        <thead>
                            <tr>
                                <th>Absence Type</th>
                                <th>Monthly Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.length > 0 &&
                                tableData.map((dataRow, index) => {
                                    return (
                                        <tr key={index}>
                                            <td>{dataRow.description}</td>
                                            <td>{dataRow.count}</td>
                                        </tr>
                                    )
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
};
