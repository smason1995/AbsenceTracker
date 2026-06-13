import React from 'react';

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
    return (
        <>
            <ExportSection />
            <SelectionSection />
            <SettingsSection />
            <EmployeeDataSection />
            <EmployeeSummarySection />
            <TypesDailySummarySection />
            <TypesMonthlySummarySection />
        </>
    );
};

export default App;