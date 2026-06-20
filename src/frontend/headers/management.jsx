import React, { use } from 'react';
import { useState, useEffect, useRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';

import {
    TableRowAddIcon,
    TableRowDeleteIcon,
    CheckmarkIcon,
    DismissIcon
} from '../icons.jsx';

function EmployeeManagement({
    employees = [], setEmployees
}) {
    const [employeeList, setEmployeeList] = useState([]);
    const [allCerts, setAllCerts] = useState([]);
    const [newCerts, setNewCerts] = useState([]);

    const employeeRef = useRef(employeeList);

    useEffect(() => {
        employeeRef.current = employeeList;
    }, [employeeList])

    useEffect(() => {
        window.api.getAllEmployees()
            .then((data) => setEmployeeList(data || []))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));
        window.api.getAllCerts()
            .then((data) => setAllCerts(data || []))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));

        return () => {
            const dbOperationsQueue = [];

            employeeRef.current.forEach((employee) => {
                if (!employee.employee_id?.trim() || !employee.first_name?.trim() || !employee.last_name?.trim()) {
                    return;
                }

                if (employee.isNew) {
                    dbOperationsQueue.push(
                        window.api.insertEmployee(employee)
                            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`))
                    );
                }
                else if (employee.isProfileDirty) {
                    dbOperationsQueue.push(
                        window.api.updateEmployee(employee)
                            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`))
                    );
                }
                else if (employee.isCertsDirty) {
                    const newId = /temp/i;
                    employee.certificates.split(',').map((cert) => {
                        const parts = cert.split(':');
                        if (parts[0] && parts[1]) {
                            if (newId.test(parts[2])) {
                                const json = {
                                    employee_id: employee.id,
                                    certs_title: parts[0],
                                    expiration: parts[1]
                                }
                                dbOperationsQueue.push(
                                    window.api.insertEmployeeCert(json)
                                        .catch((error) => console.error(`Database IPC retrieval failure: ${error}`))
                                );
                            }
                            else if (parts[3]) {
                                const json = {
                                    employee_id: employee.id,
                                    certs_title: parts[0],
                                    expiration: parts[1],
                                    id: parts[2]
                                }
                                dbOperationsQueue.push(
                                    window.api.updateEmployeeCert(json)
                                        .catch((error) => console.error(`Database IPC retrieval failure: ${error}`))
                                );
                            }
                        }
                    })
                }
            });

            if (dbOperationsQueue.length > 0) {
                Promise.all(dbOperationsQueue)
                    .then((freshData) => setEmployees(freshData || []))
                    .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));

            }
        }
    }, [employees]);

    // 1. ADD NEW EMPLOYEE ROW
    const handleEmployeeAdd = () => {
        const newEmployee = {
            id: null, // Signals to the backend it's a new database entry
            employee_id: '',
            first_name: '',
            last_name: '',
            certificates: null,
            active: 'Y',
            isNew: true,
            isProfileDirty: false,
            isCertsDirty: false
        };
        setEmployeeList((prevData) => [...prevData, newEmployee]);
    };

    // Updates top-level employee text inputs (id, names, active toggle)
    const handleRowValueChange = (rowIndex, columnField, newValue) => {
        setEmployeeList((prevData) => {
            const updatedRows = [...prevData];
            const targetRow = updatedRows[rowIndex];
            updatedRows[rowIndex] = {
                ...targetRow,
                [columnField]: newValue,
                isProfileDirty: targetRow.isNew ? false : true
            };
            return updatedRows;
        });
    };

    // 2. ADD NEW CERTIFICATE TO EMPLOYEE
    const handleCertAdd = (employeeIndex) => {
        const tempAssignmentId = `temp_assign_${Date.now()}`;
        // Enforces SQLite schema format -> title:expiration_date:assignment_id
        const newCertString = `::${tempAssignmentId}`;

        setEmployeeList((prevData) => {
            const updatedRows = [...prevData];
            const targetRow = updatedRows[employeeIndex];

            const currentCerts = targetRow.certificates;
            const updatedCerts = currentCerts
                ? `${currentCerts},${newCertString}`
                : newCertString;

            updatedRows[employeeIndex] = {
                ...targetRow,
                certificates: updatedCerts,
                isCertsDirty: targetRow.isNew ? false : true
            };
            return updatedRows;
        });
    };

    // Updates nested inner popover state values (combobox changes or date inputs)
    const handleCertValueChange = (employeeIndex, certIdx, partIndex, newValue) => {
        setEmployeeList((prevData) => {
            const updatedRows = [...prevData];
            const targetRow = updatedRows[employeeIndex];
            const newId = /temp/i;

            let certList = targetRow.certificates ? targetRow.certificates.split(',') : [];
            let certParts = certList[certIdx] ? certList[certIdx].split(':') : ['', '', ''];

            // Map the field index change (0 = title, 1 = date, 2 = id)
            certParts[partIndex] = newValue;
            if (!newId.test(certParts[2])) {
                certParts[3] = 'updated'
                certList[certIdx] = certParts.join(':');
            }
            else {
                certList[certIdx] = certParts.join(':');
            }

            updatedRows[employeeIndex] = {
                ...targetRow,
                certificates: certList.join(','),
                isCertsDirty: targetRow.isNew ? false : true
            };
            return updatedRows;
        });
    };

    // Removes certificate string segment from employee
    const handleCertDelete = (employeeIndex, certIdx) => {
        setEmployeeList((prevData) => {
            const updatedRows = [...prevData];
            const targetRow = updatedRows[employeeIndex];

            let certList = targetRow.certificates ? targetRow.certificates.split(',') : [];
            certList.splice(certIdx, 1);

            updatedRows[employeeIndex] = {
                ...targetRow,
                certificates: certList.length > 0 ? certList.join(',') : null,
                isCertsDirty: targetRow.id ? true : targetRow.isCertsDirty
            };
            return updatedRows;
        });
    };

    const CertsDetail = (row, employeeIndex) => {
        let certList = row.certificates ? row.certificates.split(',') : [];

        return (
            <div className='popover-body'>
                <div className="matrix-table-scroll-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Expiration</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {certList.length > 0 &&
                                certList.map((cert, certIdx) => {
                                    const parts = cert.split(':');
                                    const title = parts[0] || '';
                                    const expire = parts[1] || '';
                                    const assignmentId = parts[2] || '';
                                    return (
                                        <tr key={assignmentId || certIdx}>
                                            <td>
                                                <select
                                                    value={title}
                                                    onChange={(ev) => handleCertValueChange(employeeIndex, certIdx, 0, ev.target.value)}
                                                >
                                                    <option value="" disabled>-- Select Certificate --</option>
                                                    {allCerts.length > 0 &&
                                                        allCerts.map((certOption) => (
                                                            <option key={certOption.id} value={certOption.title}>
                                                                {certOption.title}
                                                            </option>
                                                        ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="date"
                                                    value={expire}
                                                    onChange={(ev) => handleCertValueChange(employeeIndex, certIdx, 1, ev.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="icon-clear-btn"
                                                    onClick={() => handleCertDelete(employeeIndex, certIdx)}
                                                >
                                                    <TableRowDeleteIcon size={24} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
                <div className="popover-site-info">
                    <button
                        type="button"
                        onClick={() => handleCertAdd(employeeIndex)}
                        title="Add new cert"
                    >
                        <TableRowAddIcon size={24} />
                    </button>
                </div>
            </div>
        );
    };

    const certTitles = (dataRow) => {
        return dataRow.certificates
            ? dataRow.certificates
                .split(',')
                .map(cert => cert.split(':')[0])
                .filter(Boolean)
                .join(', ') || 'None'
            : 'None';
    };

    return (
        <div style={{ padding: '4px 0' }}>
            <div className='dialog-table-container'>
                <table>
                    <thead>
                        <tr>
                            {/* Explicitly portion widths to avoid column snapping */}
                            <th style={{ width: '20%' }}>Employee ID</th>
                            <th style={{ width: '25%' }}>First Name</th>
                            <th style={{ width: '25%' }}>Last Name</th>
                            <th style={{ width: '20%' }}>Certificates</th>
                            <th style={{ width: '10%' }}>Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employeeList.length > 0 &&
                            employeeList.map((dataRow, index) => {
                                return (
                                    <tr key={index}>
                                        <td>
                                            <input
                                                className='auto-width-input'
                                                placeholder="e.g. 10023"
                                                value={dataRow.employee_id || ''}
                                                onChange={(ev) => handleRowValueChange(index, 'employee_id', ev.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className='auto-width-input'
                                                placeholder="First Name"
                                                value={dataRow.first_name || ''}
                                                onChange={(ev) => handleRowValueChange(index, 'first_name', ev.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className='auto-width-input'
                                                placeholder="Last Name"
                                                value={dataRow.last_name || ''}
                                                onChange={(ev) => handleRowValueChange(index, 'last_name', ev.target.value)}
                                            />
                                        </td>
                                        <td title={dataRow.certificates}>
                                            <Popover.Root modal={true}>
                                                <Popover.Trigger asChild>
                                                    <span style={{ cursor: 'pointer', display: 'block', width: '100%' }}>
                                                        {certTitles(dataRow)}
                                                    </span>
                                                </Popover.Trigger>

                                                <Popover.Portal>
                                                    <Popover.Content
                                                        className='dialog-popover-content'
                                                        side="top"
                                                        sideOffset={6}
                                                        align='center'
                                                    >
                                                        <div className='popover-accent-bar' />
                                                        {CertsDetail(dataRow, index)}
                                                        <Popover.Arrow className='matrix-popover-arrow' />
                                                    </Popover.Content>
                                                </Popover.Portal>
                                            </Popover.Root>
                                        </td>
                                        <td>
                                            <select
                                                className='auto-width-select'
                                                value={dataRow.active || ''}
                                                onChange={(ev) => handleRowValueChange(index, 'active', ev.target.value)}
                                            >
                                                <option value='Y'>Y</option>
                                                <option value='N'>N</option>
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>
            <div className="popover-site-info">
                <button
                    type="button"
                    onClick={handleEmployeeAdd}
                    title="Add new employee"
                >
                    <TableRowAddIcon size={24} />
                </button>
            </div>
        </div>
    );
}

function SitesManagement({
    sites = [], setSites
}) {
    const [siteList, setSiteList] = useState([]);

    const siteRef = useRef(siteList);

    useEffect(() => {
        siteRef.current = siteList;
    }, [siteList]);

    useEffect(() => {
        window.api.getAllSites()
            .then((data) => setSiteList(data))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));

        return () => {
            const dbOperationsQueue = [];

            siteRef.current.forEach((site) => {
                if (site.isNew) {
                    dbOperationsQueue.push(
                        window.api.insertSite(site)
                            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`))
                    );
                }
                else if (site.isDirty) {
                    dbOperationsQueue.push(
                        window.api.updateSite(site)
                            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`))
                    );
                }
            });

            if (dbOperationsQueue.length > 0) {
                Promise.all(dbOperationsQueue)
                    .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));
            }
        }
    }, [sites]);

    const handleSiteAdd = () => {
        const newSite = {
            id: null, // Signals to the backend it's a new database entry
            name: null,
            active: 'Y',
            isNew: true,
            isDirty: false
        };
        setSiteList((prevData) => [...prevData, newSite]);
    };

    const handleRowValueChange = (rowIndex, columnField, newValue) => {
        setSiteList((prevData) => {
            const updatedRows = [...prevData];
            const targetRow = updatedRows[rowIndex];
            updatedRows[rowIndex] = {
                ...targetRow,
                [columnField]: newValue,
                isDirty: targetRow.isNew ? false : true
            };
            return updatedRows;
        });
    };

    return (
        <div style={{ padding: '4px 0' }}>
            <div className='dialog-table-container'>
                <table>
                    <thead>
                        <tr>
                            <th>Site Name</th>
                            <th>Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {siteList.length > 0 &&
                            siteList.map((dataRow, index) => {
                                return (
                                    <tr key={index}>
                                        <td>
                                            <input
                                                className='auto-width-input'
                                                placeholder="e.g. 10023"
                                                value={dataRow.name || ''}
                                                onChange={(ev) => handleRowValueChange(index, 'name', ev.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <select
                                                className='auto-width-select'
                                                value={dataRow.active || ''}
                                                onChange={(ev) => handleRowValueChange(index, 'active', ev.target.value)}
                                            >
                                                <option value='Y'>Y</option>
                                                <option value='N'>N</option>
                                            </select>
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
                    onClick={handleSiteAdd}
                    title="Add new site"
                >
                    <TableRowAddIcon size={24} />
                </button>
            </div>
        </div>
    )
}

export const ManagementDialog = ({
    employees = [], setEmployees,
    sites = [], setSites
}) => {
    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <button type="button">Management</button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content">

                    <Dialog.Title className="dialog-title">Employee and Sites</Dialog.Title>
                    <Dialog.Description className="dialog-description">
                        Manage employees, sites.
                    </Dialog.Description>

                    {/* Embedded Configuration Tabs Sheet */}
                    <Tabs.Root className="tabs-root" defaultValue="employees">
                        <Tabs.List className="tabs-list" aria-label="Settings categories">
                            <Tabs.Trigger className="tabs-trigger" value="employees">
                                Employees
                            </Tabs.Trigger>
                            <Tabs.Trigger className="tabs-trigger" value="sites">
                                Sites
                            </Tabs.Trigger>
                        </Tabs.List>

                        <Tabs.Content className="tabs-content" value="employees">
                            <EmployeeManagement
                                employees={employees} setEmployees={setEmployees}
                            />
                        </Tabs.Content>

                        <Tabs.Content className="tabs-content" value="sites">
                            <SitesManagement
                                sites={sites} setSites={setSites}
                            />
                        </Tabs.Content>
                    </Tabs.Root>

                    {/* Top corner clean dismiss button control */}
                    <Dialog.Close asChild>
                        <button className="dialog-close-btn" aria-label="Close settings window">
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