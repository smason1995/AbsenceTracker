import React, { use } from 'react';
import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';

import { DownloadIcon } from '../icons.jsx';

function SingleEmployeeExportForm() {
    return (
        <form>
            <p>Exporting data for single employees.</p>
            <select>
                <option value="emp1">Employee 1</option>
                <option value="emp2">Employee 2</option>
                <option value="emp3">Employee 3</option>
            </select>
            <section>
                <input type="checkbox" id="single-full-history" />
                <label htmlFor="single-full-history">Full History</label>
            </section>
            <input type="date" placeholder="Start Date" />
            <input type="date" placeholder="End Date" />
            <section>
                <input type="checkbox" id="single-highlight" />
                <label htmlFor="single-highlight">Highlight when 3 or more absences occur in 30 days</label>
            </section>
            <button className="download-button">
                <DownloadIcon size={24} />
            </button>
        </form>
    );
}

function ActiveEmployeesExportForm() {
    return (
        <form>
            <p>Exporting data for all active employees.</p>
            <section>
                <input type="checkbox" id="active-full-history" />
                <label htmlFor="active-full-history">Full History</label>
            </section>
            <input type="date" placeholder="Start Date" />
            <input type="date" placeholder="End Date" />
            <section>
                <input type="checkbox" id="active-highlight" />
                <label htmlFor="active-highlight">Highlight when 3 or more absences occur in 30 days</label>
            </section>
            <button className="download-button">
                <DownloadIcon size={24} />
            </button>
        </form>
    );
}

function InactiveEmployeesExportForm() {
    return (
        <form>
            <p>Exporting data for all inactive employees.</p>
            <section>
                <input type="checkbox" id="inactive-full-history" />
                <label htmlFor="inactive-full-history">Full History</label>
            </section>
            <input type="date" placeholder="Start Date" />
            <input type="date" placeholder="End Date" />
            <section>
                <input type="checkbox" id="inactive-highlight" />
                <label htmlFor="inactive-highlight">Highlight when 3 or more absences occur in 30 days</label>
            </section>
            <button className="download-button">
                <DownloadIcon size={24} />
            </button>
        </form>
    );
}

function AllEmployeesExportForm() {
    return (
        <form>
            <p>Exporting data for all employees.</p>
            <section>
                <input type="checkbox" id="all-full-history" />
                <label htmlFor="all-full-history">Full History</label>
            </section>
            <input type="date" placeholder="Start Date" />
            <input type="date" placeholder="End Date" />
            <section>
                <input type="checkbox" id="all-highlight" />
                <label htmlFor="all-highlight">Highlight when 3 or more absences occur in 30 days</label>
            </section>
            <button className="download-button">
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

                    <Dialog.Title className="dialog-title">Certificate and Absence Types</Dialog.Title>
                    <Dialog.Description className="dialog-description">
                        Manage certificates and types of absences.
                    </Dialog.Description>

                    <div>
                        <select value={selectedOption} onChange={(ev) => setSelectedOption(ev.target.value)}>
                            <option value="single-employee" selected>Single Employee Look Up</option>
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