import React, { use } from 'react';
import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';

import { TableRowAddIcon } from '../icons.jsx';

function CertsManagement() {
    const [certList, setCertList] = useState([]);
    const [newCert, setNewCert] = useState('');

    const certRef = useRef(certList);

    useEffect(() => {
        certRef.current = certList
    }, [certList])

    useEffect(() => {
        window.api.getAllCerts()
            .then((data) => setCertList(data || []))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));

        return () => {
            const dbOperationsQueue = [];

            certRef.current.forEach((cert) => {
                if (cert.isNew) {
                    dbOperationsQueue.push(
                        window.api.insertCert(cert)
                            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`))
                    );
                }
            });

            if (dbOperationsQueue.length > 0) {
                Promise.all(dbOperationsQueue)
                    .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));
            }
        };
    }, []);

    const handleAddRecord = (newCertTitle) => {
        setCertList((prevData) => [
            ...prevData,
            {
                title: newCertTitle,
                isNew: true
            }
        ]);
        setNewCert('');
    }

    return (
        <div style={{ padding: '4px 0' }}>
            <div className="popover-site-info">
                <input
                    className='auto-width-input'
                    placeholder='New Cert'
                    value={newCert}
                    onChange={(ev) => setNewCert(ev.target.value)}
                />
                <button
                    type="button"
                    title="Add new certification"
                    disabled={!newCert}
                    onClick={() => handleAddRecord(newCert)}
                >
                    <TableRowAddIcon size={24} />
                </button>
            </div>
            <div className='dialog-table-container'>
                <table>
                    <thead>
                        <tr>
                            <th>Certification</th>
                        </tr>
                    </thead>
                    <tbody>
                        {certList.length > 0 &&
                            certList.map((dataRow, index) => {
                                return (
                                    <tr key={index}>
                                        <td>{dataRow.title}</td>
                                    </tr>
                                )
                            })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function TypesManagement() {
    const [typeList, setTypeList] = useState([]);
    const [newCode, setNewCode] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const typeRef = useRef(typeList);

    useEffect(() => {
        typeRef.current = typeList;
    }, [typeList])

    useEffect(() => {
        window.api.getAllTypes()
            .then((data) => setTypeList(data || []))
            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));

        return () => {
            const dbOperationsQueue = [];

            typeRef.current.forEach((type) => {
                if (type.isNew) {
                    dbOperationsQueue.push(
                        window.api.insertType(type)
                            .catch((error) => console.error(`Database IPC retrieval failure: ${error}`))
                    );
                }
            });

            if (dbOperationsQueue.length > 0) {
                Promise.all(dbOperationsQueue)
                    .catch((error) => console.error(`Database IPC retrieval failure: ${error}`));
            }
        };
    }, []);

    const handleAddRecord = (newCodeVal, newCodeDesc) => {
        setTypeList((prevData) => [
            ...prevData,
            {
                code: newCodeVal,
                description: newCodeDesc,
                isNew: true
            }
        ]);
        setNewCode('');
        setNewDesc('');
    }

    return (
        <div style={{ padding: '4px 0' }}>
            <div className="popover-site-info">
                <input
                    className='auto-width-input'
                    placeholder='New Code'
                    value={newCode}
                    onChange={(ev) => setNewCode(ev.target.value)}
                />
                <input
                    className='auto-width-input'
                    placeholder='New Description'
                    value={newDesc}
                    onChange={(ev) => setNewDesc(ev.target.value)}
                />
                <button
                    type="button"
                    title="Add new certification"
                    disabled={!newCode || !newDesc}
                    onClick={() => handleAddRecord(newCode, newDesc)}
                >
                    <TableRowAddIcon size={24} />
                </button>
            </div>
            <div className='dialog-table-container'>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '30%' }}>Code</th>
                            <th style={{ width: '70%' }}>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {typeList.length > 0 &&
                            typeList.map((dataRow, index) => {
                                return (
                                    <tr key={index}>
                                        <td>{dataRow.code}</td>
                                        <td>{dataRow.description}</td>
                                    </tr>
                                )
                            })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export const ValidationDialog = () => {
    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <button type="button">Validation</button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content">

                    <Dialog.Title className="dialog-title">Certificate and Absence Types</Dialog.Title>
                    <Dialog.Description className="dialog-description">
                        Manage certificates and types of absences.
                    </Dialog.Description>

                    {/* Embedded Configuration Tabs Sheet */}
                    <Tabs.Root className="tabs-root" defaultValue="employees">
                        <Tabs.List className="tabs-list" aria-label="Settings categories">
                            <Tabs.Trigger className="tabs-trigger" value="certs">
                                Certications
                            </Tabs.Trigger>
                            <Tabs.Trigger className="tabs-trigger" value="types">
                                Absence Types
                            </Tabs.Trigger>
                        </Tabs.List>

                        <Tabs.Content className="tabs-content" value="certs">
                            <CertsManagement />
                        </Tabs.Content>

                        <Tabs.Content className="tabs-content" value="types">
                            <TypesManagement />
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