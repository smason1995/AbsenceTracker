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
    /* Header State Props */
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear())
    /* Body State Props */
    const [absenceTableJson, setAbsenceTableJson] = useState([]);
    return (
        <>
            <ExportSection />
            <SelectionSection
                month={month} setMonth={setMonth}
                year={year} setYear={setYear}
            />
            <SettingsSection />
            <EmployeeDataSection
                absenceTableJson={absenceTableJson} setAbsenceTableJson={setAbsenceTableJson}
                month={month} year={year}
            />
            <EmployeeSummarySection />
            <TypesDailySummarySection />
            <TypesMonthlySummarySection />
        </>
    );
};

export default App;