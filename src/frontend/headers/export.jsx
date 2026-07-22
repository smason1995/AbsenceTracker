import React, { use } from 'react';
import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';

import { DownloadIcon } from '../icons.jsx';

function SingleEmployeeExportForm() {
    const [employeeList, setEmployeeList] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [fullHistory, setFullHistory] = useState(true);
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [highlight, setHighlight] = useState(true);
    const [exportClickCount, setExportClickCount] = useState(0);
    const [savePath, setSavePath] = useState(null);

    useEffect(() => {
        window.api.getAllEmployees()
            .then((data) => {
                let json = [];
                data.forEach(employee => {
                    const rec = {
                        display: employee.active === 'Y' ? `${employee.first_name} ${employee.last_name} - Active` : `${employee.first_name} ${employee.last_name} - Inactive`,
                        value: employee.id
                    }
                    json.push(rec);
                });
                setEmployeeList(json || []);
                setSelectedEmployee(json.length > 0 ? json[0].value : null);
            })
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));

        // Backup default path
        window.api.getExportPath()
            .then((path) => {
                setSavePath(path);
            })
            .catch((error) => console.error(`Failed to retrieve export path: ${error}`));
    }, []);

    useEffect(() => {
        if (exportClickCount > 0) {
            console.log(`
                Selected Employee: ${selectedEmployee}
                Full History: ${fullHistory}
                Start Date: ${startDate}
                End Date: ${endDate}
                Highlight: ${highlight}
                Export Click Count: ${exportClickCount}
            `)

            const executeExport = async () => {
                const fullHistoryFlag = fullHistory ? 1 : 0;

                const startPath = await window.api.getExportPath();

                const defaultPath = await window.api.getDefaultPath((startPath? startPath : savePath), `Employee_Absence_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

                const path = await window.api.saveFilePicker({
                    title: 'Select Save Location for Employee Report',
                    defaultPath: defaultPath,
                    buttonLabel: 'Save Report',
                    filters: [
                        { name: 'Excel Files', extensions: ['xlsx'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                })

                await window.api.setExportPath(path);

                const reportJson = await window.api.getSingleEmployeeReport(selectedEmployee, fullHistoryFlag, startDate, endDate);

                if (!highlight) {
                    reportJson.forEach(record => {
                        record.limit_check = 'N';
                    });
                }

                const exportResult = await window.api.generateEmployeeReport(reportJson);

                if (exportResult.success) {
                    console.log(`Report successfully exported to: ${exportResult.message}`);
                } else {
                    console.error(`Error exporting report: ${exportResult.message}`);
                }
            };

            executeExport();
        }
    }, [exportClickCount]);

    return (
        <form>
            <p>Exporting data for single employees.</p>
            <select value={selectedEmployee || ''} onChange={(e) => setSelectedEmployee(e.target.value)}>
                {employeeList.length === 0 ? (
                    <option key="no-employees" value="">
                        No employees found
                    </option>
                ) : (
                    employeeList.map((employee) => (
                        <option key={employee.value} value={employee.value}>
                            {employee.display}
                        </option>
                    ))
                )}
            </select>
            <section>
                <input
                    type="checkbox" id="single-full-history"
                    checked={fullHistory}
                    onChange={(e) => setFullHistory(e.target.checked)}
                />
                <label htmlFor="single-full-history">Full History</label>
            </section>
            <input
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={fullHistory}
            />
            <input
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={fullHistory}
            />
            <section>
                <input
                    type="checkbox"
                    id="single-highlight"
                    checked={highlight}
                    onChange={(e) => setHighlight(e.target.checked)}
                />
                <label htmlFor="single-highlight">Highlight when 3 or more absences occur in 30 days</label>
            </section>
            <button
                type="button"
                className="download-button"
                onClick={() => setExportClickCount(exportClickCount + 1)}
            >
                <DownloadIcon size={24} />
            </button>
        </form>
    );
}

function ActiveEmployeesExportForm() {
    const [fullHistory, setFullHistory] = useState(true);
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [highlight, setHighlight] = useState(true);
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
        if (exportClickCount > 0) {
            console.log(`
                Full History: ${fullHistory}
                Start Date: ${startDate}
                End Date: ${endDate}
                Highlight: ${highlight}
                Export Click Count: ${exportClickCount}
            `)

            const executeExport = async () => {

                const fullHistoryFlag = fullHistory ? 1 : 0;

                const startPath = await window.api.getExportPath();

                const defaultPath = await window.api.getDefaultPath((startPath ? startPath : savePath), `Employee_Absence_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

                const path = await window.api.saveFilePicker({
                    title: 'Select Save Location for Employee Report',
                    defaultPath: defaultPath,
                    buttonLabel: 'Save Report',
                    filters: [
                        { name: 'Excel Files', extensions: ['xlsx'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                })

                await window.api.setExportPath(path);

                const reportJson = await window.api.getActiveEmployeeReport(fullHistoryFlag, startDate, endDate)

                if (!highlight) {
                    reportJson.forEach(record => {
                        record.limit_check = 'N';
                    });
                }

                const exportResult = await window.api.generateEmployeeReport(reportJson);

                if (exportResult.success) {
                    console.log(`Report successfully exported to: ${exportResult.message}`);
                } else {
                    console.error(`Error exporting report: ${exportResult.message}`);
                }
            }

            executeExport();
        };
    }, [exportClickCount]);

    return (
        <form>
            <p>Exporting data for all active employees.</p>
            <section>
                <input
                    type="checkbox" id="single-full-history"
                    checked={fullHistory}
                    onChange={(e) => setFullHistory(e.target.checked)}
                />
                <label htmlFor="single-full-history">Full History</label>
            </section>
            <input
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={fullHistory}
            />
            <input
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={fullHistory}
            />
            <section>
                <input
                    type="checkbox"
                    id="single-highlight"
                    checked={highlight}
                    onChange={(e) => setHighlight(e.target.checked)}
                />
                <label htmlFor="single-highlight">Highlight when 3 or more absences occur in 30 days</label>
            </section>
            <button
                type="button"
                className="download-button"
                onClick={() => setExportClickCount(exportClickCount + 1)}
            >
                <DownloadIcon size={24} />
            </button>
        </form>
    );
}

function InactiveEmployeesExportForm() {
    const [fullHistory, setFullHistory] = useState(true);
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [highlight, setHighlight] = useState(true);
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
        if (exportClickCount > 0) {
            console.log(`
                Full History: ${fullHistory}
                Start Date: ${startDate}
                End Date: ${endDate}
                Highlight: ${highlight}
                Export Click Count: ${exportClickCount}
            `)

            const executeExport = async () => {

                const fullHistoryFlag = fullHistory ? 1 : 0;

                const startPath = await window.api.getExportPath();

                const defaultPath = await window.api.getDefaultPath((startPath ? startPath : savePath), `Employee_Absence_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

                const path = await window.api.saveFilePicker({
                    title: 'Select Save Location for Employee Report',
                    defaultPath: defaultPath,
                    buttonLabel: 'Save Report',
                    filters: [
                        { name: 'Excel Files', extensions: ['xlsx'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                })

                await window.api.setExportPath(path);

                const reportJson = await window.api.getInactiveEmployeeReport(fullHistoryFlag, startDate, endDate)

                if (!highlight) {
                    reportJson.forEach(record => {
                        record.limit_check = 'N';
                    });
                }

                const exportResult = await window.api.generateEmployeeReport(reportJson);

                if (exportResult.success) {
                    console.log(`Report successfully exported to: ${exportResult.message}`);
                } else {
                    console.error(`Error exporting report: ${exportResult.message}`);
                }
            }

            executeExport();
        }

    }, [exportClickCount]);

    return (
        <form>
            <p>Exporting data for all inactive employees.</p>
            <section>
                <input
                    type="checkbox" id="single-full-history"
                    checked={fullHistory}
                    onChange={(e) => setFullHistory(e.target.checked)}
                />
                <label htmlFor="single-full-history">Full History</label>
            </section>
            <input
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={fullHistory}
            />
            <input
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={fullHistory}
            />
            <section>
                <input
                    type="checkbox"
                    id="single-highlight"
                    checked={highlight}
                    onChange={(e) => setHighlight(e.target.checked)}
                />
                <label htmlFor="single-highlight">Highlight when 3 or more absences occur in 30 days</label>
            </section>
            <button
                type="button"
                className="download-button"
                onClick={() => setExportClickCount(exportClickCount + 1)}
            >
                <DownloadIcon size={24} />
            </button>
        </form>
    );
}

function AllEmployeesExportForm() {
    const [fullHistory, setFullHistory] = useState(true);
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [highlight, setHighlight] = useState(true);
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
        if (exportClickCount > 0) {
            console.log(`
                Full History: ${fullHistory}
                Start Date: ${startDate}
                End Date: ${endDate}
                Highlight: ${highlight}
                Export Click Count: ${exportClickCount}
            `)

            const executeExport = async () => {

                const fullHistoryFlag = fullHistory ? 1 : 0;

                const startPath = await window.api.getExportPath();

                const defaultPath = await window.api.getDefaultPath((startPath ? startPath : savePath), `Employee_Absence_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

                const path = await window.api.saveFilePicker({
                    title: 'Select Save Location for Employee Report',
                    defaultPath: defaultPath,
                    buttonLabel: 'Save Report',
                    filters: [
                        { name: 'Excel Files', extensions: ['xlsx'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                })

                await window.api.setExportPath(path);

                const reportJson = await window.api.getAllEmployeeReport(fullHistoryFlag, startDate, endDate)

                if (!highlight) {
                    reportJson.forEach(record => {
                        record.limit_check = 'N';
                    });
                }

                const exportResult = await window.api.generateEmployeeReport(reportJson);

                if (exportResult.success) {
                    console.log(`Report successfully exported to: ${exportResult.message}`);
                } else {
                    console.error(`Error exporting report: ${exportResult.message}`);
                }
            }

            executeExport();
        }
    }, [exportClickCount]);

    return (
        <form>
            <p>Exporting data for all employees.</p>
            <section>
                <input
                    type="checkbox" id="single-full-history"
                    checked={fullHistory}
                    onChange={(e) => setFullHistory(e.target.checked)}
                />
                <label htmlFor="single-full-history">Full History</label>
            </section>
            <input
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={fullHistory}
            />
            <input
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={fullHistory}
            />
            <section>
                <input
                    type="checkbox"
                    id="single-highlight"
                    checked={highlight}
                    onChange={(e) => setHighlight(e.target.checked)}
                />
                <label htmlFor="single-highlight">Highlight when 3 or more absences occur in 30 days</label>
            </section>
            <button
                type="button"
                className="download-button"
                onClick={() => setExportClickCount(exportClickCount + 1)}
            >
                <DownloadIcon size={24} />
            </button>
        </form>
    );
}

export const ExportDialog = () => {
    const [selectedOption, setSelectedOption] = useState('single-employee');
    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <button type="button">Export</button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content">

                    <Dialog.Title className="dialog-title">Report Export Wizard</Dialog.Title>
                    <Dialog.Description className="dialog-description">
                        Wizard to navigate getting exports of employee absence data.
                    </Dialog.Description>

                    <div>
                        <select value={selectedOption} onChange={(ev) => setSelectedOption(ev.target.value)}>
                            <option value="single-employee">Single Employee Look Up</option>
                            <option value="active-employees">Active Employees Look Up</option>
                            <option value="inactive-employees">Inactive Employees Look Up</option>
                            <option value="all-employees">All Employees Look Up</option>
                        </select>
                    </div>
                    <div>
                        {selectedOption === 'single-employee' && (
                            <SingleEmployeeExportForm />
                        )}
                        {selectedOption === 'active-employees' && (
                            <ActiveEmployeesExportForm />
                        )}
                        {selectedOption === 'inactive-employees' && (
                            <InactiveEmployeesExportForm />
                        )}
                        {selectedOption === 'all-employees' && (
                            <AllEmployeesExportForm />
                        )}
                    </div>

                    {/* Top corner clean dismiss button control */}
                    <Dialog.Close asChild>
                        <button className="dialog-close-btn" aria-label="Close export window">
                            {/* Using an inline minimalist closing glyph directly */}
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z" />
                            </svg>
                        </button>
                    </Dialog.Close>

                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}