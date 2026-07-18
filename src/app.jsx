import React from 'react';
import {
    useState
} from 'react';

import {
    ExportSection,
    SelectionSection,
    SettingsSection
} from './frontend/headers.jsx';
import {
    EmployeeDataSection,
    EmployeeSummarySection,
    TypesDailySummarySection,
    TypesMonthlySummarySection
} from './frontend/bodies.jsx';




const App = () => {
    /* Period State Props */
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    /* Settings State Props */
    const [employees, setEmployees] = useState([]);
    const [sites, setSites] = useState([]);
    const [certs, setCerts] = useState([]);
    const [types, setTypes] = useState([]);
    /* Body State Props */
    const [absenceTableJson, setAbsenceTableJson] = useState([]);
    return (
        <>
            <ExportSection />
            <SelectionSection
                month={month} setMonth={setMonth}
                year={year} setYear={setYear}
            />
            <SettingsSection
                employees={employees} setEmployees={setEmployees}
                sites={sites} setSites={setSites}
                certs={certs} setCerts={setCerts}
                types={types} setTypes={setTypes}
            />
            <EmployeeDataSection
                absenceTableJson={absenceTableJson} setAbsenceTableJson={setAbsenceTableJson}
                month={month} year={year}
                employees={employees}
            />
            <EmployeeSummarySection
                absenceTableJson={absenceTableJson}
                month={month} year={year}
            />
            <TypesDailySummarySection
                absenceTableJson={absenceTableJson}
                month={month} year={year}
            />
            <TypesMonthlySummarySection
                absenceTableJson={absenceTableJson}
                month={month} year={year}
            />
        </>
    );
};

export default App;