const { exec } = require('node:child_process');
const os = require('os');
const path = require('node:path');
const ExcelJS = require('exceljs');

export class ExportService {
    #path;

    // Constructor
    constructor() {
        this.#path = path.join(os.homedir(), 'Downloads');
    }

    // Setter: #path
    setExportPath(path) {
        this.#path = path;
    }

    // Getter: #path
    getExportPath() {
        return this.#path;
    }

    /**
     * Generates a styled Excel sheet from an array of employee absence records
     * @param {Array} reportJson - Flat array containing row data objects
     * @returns {Promise<Object>} success or error status object
     */
    async employeeReport(reportJson) {
        try {
            // 0. Path Validation
            if (!this.#path) {
                return { success: false, error: 'Export destination path is unconfigured.' };
            }

            // Target the array directly
            const rows = Array.isArray(reportJson) ? reportJson : [];

            if (rows.length === 0) {
                return { success: false, error: 'No record entries found to process export.' };
            }

            // 1. Initialize Workbook & Worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Employee Absence Analysis');

            // 2. Generate Schema Columns (Omitting 'limit_check')
            const baseKeys = Object.keys(rows[0]);
            const productionHeaders = baseKeys.filter(key => key !== 'limit_check');

            // Set up column schemas with clean titles (e.g., employee_id -> Employee Id)
            worksheet.columns = productionHeaders.map(key => ({
                header: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                key: key
            }));

            // 3. Write Data Rows & Apply Highlight Rule
            rows.forEach(rowData => {
                // Inserts the row data mapping strictly to the defined production header keys
                const excelRow = worksheet.addRow(rowData);

                // Highlight the line if the row breaks the limit
                if (rowData.limit_check === 'Y') {
                    excelRow.eachCell({ includeEmpty: true }, (cell) => {
                        // High-contrast, soft pastel red fill style
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFFC7CE' }
                        };
                        // Dark red bold font color for high legibility
                        cell.font = {
                            color: { argb: 'FF9C0006' },
                            bold: true
                        };
                    });
                }
            });

            // 4. Polish: Dynamic Column Auto-Width Adjustments
            worksheet.columns.forEach(column => {
                let maxTextLength = column.header.length;
                column.eachCell({ includeEmpty: true }, cell => {
                    const currentValLength = cell.value ? String(cell.value).length : 0;
                    if (currentValLength > maxTextLength) {
                        maxTextLength = currentValLength;
                    }
                });
                column.width = maxTextLength < 14 ? 14 : maxTextLength + 3;
            });

            // 5. Build Final Destination Storage Path
            const isExplicitFile = path.extname(this.#path) === '.xlsx';
            const finalSavePath = isExplicitFile
                ? this.#path
                : path.join(this.#path, `Employee_Absence_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

            // 6. Asynchronously stream file out to disk
            await workbook.xlsx.writeFile(finalSavePath);

            return {
                success: true,
                message: `Report successfully exported to: ${finalSavePath}`
            };

        } catch (error) {
            console.error(`Error generating employee report: ${error}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generates a matrix-style Excel sheet from a scraped DOM table object structure
     * @param {Object} matrixJson - Combined metadata and row matrix payload
     * @returns {Promise<Object>} success or error status object
     */
    async absenceMatrixReport(matrixJson) {
        try {
            // 0. Validation Checks
            if (!this.#path) {
                return { success: false, error: 'Export destination path is unconfigured.' };
            }

            if (!matrixJson || !matrixJson.meta || !Array.isArray(matrixJson.data)) {
                return { success: false, error: 'Invalid matrix structural layout provided for export.' };
            }

            const { meta, data: rows } = matrixJson;

            if (rows.length === 0) {
                return { success: false, error: 'No record entries found to fill matrix data blocks.' };
            }

            // 1. Initialize Workbook & Worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Absence Matrix Analysis');

            // 2. Write Metadata across Row 1 columns
            worksheet.getRow(1).values = [
                `Month: ${meta.month}`,
                `Year: ${meta.year}`
            ];

            // Format meta text style slightly to stand out
            worksheet.getRow(1).font = { italic: true, bold: true, color: { argb: 'FF555555' } };

            // 3. Extract calendar days dynamically, sorting them numerically
            const firstRecord = rows[0];
            const days = Object.keys(firstRecord)
                .filter(key => !isNaN(key))
                .sort((a, b) => Number(a) - Number(b));

            // 4. Construct Headers (Row 3) - Column A = Name, Column B+ = Sorted Days
            worksheet.getRow(3).values = ['Name', ...days];
            worksheet.getRow(3).font = { bold: true };

            // 5. Populate Row Data & Evaluate Individual Cell Highlights
            rows.forEach((rowData) => {
                // Compile row values sequentially array tracking
                const rowValues = [rowData.Name];
                days.forEach(day => {
                    rowValues.push(rowData[day]?.text || '');
                });

                const excelRow = worksheet.addRow(rowValues);

                // Run down individual elements to catch conditional styles
                days.forEach((day, index) => {
                    const cellMeta = rowData[day];
                    if (cellMeta && cellMeta.highlight === 1) {
                        // Column A is index 1 (Name), Column B (Day 1) is index 2, etc.
                        const targetCellColIndex = index + 2;
                        const cell = excelRow.getCell(targetCellColIndex);

                        // High-contrast soft pastel red fill style
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFFC7CE' }
                        };
                        // Dark red bold font color for high legibility
                        cell.font = {
                            color: { argb: 'FF9C0006' },
                            bold: true
                        };
                    }
                });
            });

            // 6. Polish: Dynamic Column Auto-Width Adjustments
            // Manually loop columns to evaluate string lengths cleanly
            const totalColumns = days.length + 1;
            for (let i = 1; i <= totalColumns; i++) {
                const column = worksheet.getColumn(i);
                let maxTextLength = 0;

                column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
                    // Skip checking metadata row for column width evaluations
                    if (rowNumber === 1) return;

                    const currentValLength = cell.value ? String(cell.value).length : 0;
                    if (currentValLength > maxTextLength) {
                        maxTextLength = currentValLength;
                    }
                });

                // Set wider tracking limits for Name column vs narrow day columns
                if (i === 1) {
                    column.width = maxTextLength < 18 ? 18 : maxTextLength + 3;
                } else {
                    column.width = maxTextLength < 6 ? 6 : maxTextLength + 2;
                    column.alignment = { horizontal: 'center' }; // Center numerical marks
                }
            }

            // 7. Build Final Destination Storage Path
            const isExplicitFile = path.extname(this.#path) === '.xlsx';
            const finalSavePath = isExplicitFile
                ? this.#path
                : path.join(this.#path, `Absence_Table_Export_${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}.xlsx`);

            // 8. Stream file out to disk
            await workbook.xlsx.writeFile(finalSavePath);

            return {
                success: true,
                message: `Report successfully exported to: ${finalSavePath}`
            };

        } catch (error) {
            console.error(`Error generating matrix employee report: ${error}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generates a matrix-style Excel sheet from a scraped DOM table object structure
     * @param {Object} matrixJson - Combined metadata and row matrix payload
     * @returns {Promise<Object>} success or error status object
     */
    async typeDailyMatrixReport(matrixJson) {
        try {
            // 0. Validation Checks
            if (!this.#path) {
                return { success: false, error: 'Export destination path is unconfigured.' };
            }

            if (!matrixJson || !matrixJson.meta || !Array.isArray(matrixJson.data)) {
                return { success: false, error: 'Invalid matrix structural layout provided for export.' };
            }

            const { meta, data: rows } = matrixJson;

            if (rows.length === 0) {
                return { success: false, error: 'No record entries found to fill matrix data blocks.' };
            }

            // 1. Initialize Workbook & Worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Absence Matrix Analysis');

            // 2. Write Metadata across Row 1 columns
            worksheet.getRow(1).values = [
                `Month: ${meta.month}`,
                `Year: ${meta.year}`
            ];

            // Format meta text style slightly to stand out
            worksheet.getRow(1).font = { italic: true, bold: true, color: { argb: 'FF555555' } };

            // 3. Extract calendar days dynamically, sorting them numerically
            const firstRecord = rows[0];
            const days = Object.keys(firstRecord)
                .filter(key => !isNaN(key))
                .sort((a, b) => Number(a) - Number(b));

            // 4. Construct Headers (Row 3) - Column A = Name, Column B+ = Sorted Days
            worksheet.getRow(3).values = ['Absence Type', ...days];
            worksheet.getRow(3).font = { bold: true };

            // 5. Populate Row Data & Evaluate Individual Cell Highlights
            rows.forEach((rowData) => {
                // Compile row values sequentially array tracking
                const rowValues = [rowData['Absence Type']];
                days.forEach(day => {
                    rowValues.push(rowData[day]?.text || '');
                });

                const excelRow = worksheet.addRow(rowValues);

                // Run down individual elements to catch conditional styles
                days.forEach((day, index) => {
                    const cellMeta = rowData[day];
                    if (cellMeta && cellMeta.highlight === 1) {
                        // Column A is index 1 (Name), Column B (Day 1) is index 2, etc.
                        const targetCellColIndex = index + 2;
                        const cell = excelRow.getCell(targetCellColIndex);

                        // High-contrast soft pastel red fill style
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFFC7CE' }
                        };
                        // Dark red bold font color for high legibility
                        cell.font = {
                            color: { argb: 'FF9C0006' },
                            bold: true
                        };
                    }
                });
            });

            // 6. Polish: Dynamic Column Auto-Width Adjustments
            // Manually loop columns to evaluate string lengths cleanly
            const totalColumns = days.length + 1;
            for (let i = 1; i <= totalColumns; i++) {
                const column = worksheet.getColumn(i);
                let maxTextLength = 0;

                column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
                    // Skip checking metadata row for column width evaluations
                    if (rowNumber === 1) return;

                    const currentValLength = cell.value ? String(cell.value).length : 0;
                    if (currentValLength > maxTextLength) {
                        maxTextLength = currentValLength;
                    }
                });

                // Set wider tracking limits for Name column vs narrow day columns
                if (i === 1) {
                    column.width = maxTextLength < 18 ? 18 : maxTextLength + 3;
                } else {
                    column.width = maxTextLength < 6 ? 6 : maxTextLength + 2;
                    column.alignment = { horizontal: 'center' }; // Center numerical marks
                }
            }

            // 7. Build Final Destination Storage Path
            const isExplicitFile = path.extname(this.#path) === '.xlsx';
            const finalSavePath = isExplicitFile
                ? this.#path
                : path.join(this.#path, `Types_Daily_Table_Export_${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}.xlsx`);

            // 8. Stream file out to disk
            await workbook.xlsx.writeFile(finalSavePath);

            return {
                success: true,
                message: `Report successfully exported to: ${finalSavePath}`
            };

        } catch (error) {
            console.error(`Error generating matrix employee report: ${error}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generates a monthly summary matrix Excel sheet from a scraped DOM table object structure
     * @param {Object} matrixJson - Combined metadata and row matrix payload
     * @returns {Promise<Object>} success or error status object
     */
    async employeeMonthlyMatrixReport(matrixJson) {
        try {
            // 0. Validation Checks
            if (!this.#path) {
                return { success: false, error: 'Export destination path is unconfigured.' };
            }

            if (!matrixJson || !matrixJson.meta || !Array.isArray(matrixJson.data)) {
                return { success: false, error: 'Invalid matrix structural layout provided for export.' };
            }

            const { meta, data: rows } = matrixJson;

            if (rows.length === 0) {
                return { success: false, error: 'No record entries found to fill matrix data blocks.' };
            }

            // 1. Initialize Workbook & Worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Monthly Summary Analysis');

            // 2. Write Metadata across Row 1 columns
            worksheet.getRow(1).values = [
                `Month: ${meta.month}`,
                `Year: ${meta.year}`
            ];

            // Format meta text style slightly to stand out
            worksheet.getRow(1).font = { italic: true, bold: true, color: { argb: 'FF555555' } };

            // 3. Extract absence code categories dynamically (everything except 'Name')
            const firstRecord = rows[0];
            const categories = Object.keys(firstRecord).filter(key => key !== 'Name');

            // 4. Construct Headers (Row 3) - Column A = Name, Column B+ = Absence Type Codes
            worksheet.getRow(3).values = ['Name', ...categories];
            worksheet.getRow(3).font = { bold: true };

            // 5. Populate Row Data & Evaluate Individual Cell Highlights
            rows.forEach((rowData) => {
                // Compile row values sequentially
                const rowValues = [rowData.Name];
                categories.forEach(categoryKey => {
                    rowValues.push(rowData[categoryKey]?.text || '');
                });

                const excelRow = worksheet.addRow(rowValues);

                // Run down individual elements to catch conditional styles
                categories.forEach((categoryKey, index) => {
                    const cellMeta = rowData[categoryKey];
                    if (cellMeta && cellMeta.highlight === 1) {
                        // Column A is index 1 (Name), Column B (1st category) is index 2, etc.
                        const targetCellColIndex = index + 2;
                        const cell = excelRow.getCell(targetCellColIndex);

                        // High-contrast soft pastel red fill style
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFFC7CE' }
                        };
                        // Dark red bold font color for high legibility
                        cell.font = {
                            color: { argb: 'FF9C0006' },
                            bold: true
                        };
                    }
                });
            });

            // 6. Polish: Dynamic Column Auto-Width Adjustments
            const totalColumns = categories.length + 1;
            for (let i = 1; i <= totalColumns; i++) {
                const column = worksheet.getColumn(i);
                let maxTextLength = 0;

                column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
                    // Skip checking metadata row for column width evaluations
                    if (rowNumber === 1) return;

                    const currentValLength = cell.value ? String(cell.value).length : 0;
                    if (currentValLength > maxTextLength) {
                        maxTextLength = currentValLength;
                    }
                });

                // Set wider tracking limits for Name column vs narrow type code columns
                if (i === 1) {
                    column.width = maxTextLength < 18 ? 18 : maxTextLength + 3;
                } else {
                    column.width = maxTextLength < 6 ? 6 : maxTextLength + 2;
                    column.alignment = { horizontal: 'center' }; // Center numerical marks
                }
            }

            // 7. Build Final Destination Storage Path
            const isExplicitFile = path.extname(this.#path) === '.xlsx';
            const finalSavePath = isExplicitFile
                ? this.#path
                : path.join(this.#path, `Employee_Monthly_Summary_Export_${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}.xlsx`);

            // 8. Stream file out to disk
            await workbook.xlsx.writeFile(finalSavePath);

            return {
                success: true,
                message: `Report successfully exported to: ${finalSavePath}`
            };

        } catch (error) {
            console.error(`Error generating employee monthly summary report: ${error}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generates a monthly summary matrix Excel sheet for absence types from a scraped DOM table object structure
     * @param {Object} matrixJson - Combined metadata and row matrix payload
     * @returns {Promise<Object>} success or error status object
     */
    async typesMonthlyMatrixReport(matrixJson) {
        try {
            // 0. Validation Checks
            if (!this.#path) {
                return { success: false, error: 'Export destination path is unconfigured.' };
            }

            if (!matrixJson || !matrixJson.meta || !Array.isArray(matrixJson.data)) {
                return { success: false, error: 'Invalid matrix structural layout provided for export.' };
            }

            const { meta, data: rows } = matrixJson;

            if (rows.length === 0) {
                return { success: false, error: 'No record entries found to fill matrix data blocks.' };
            }

            // 1. Initialize Workbook & Worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Types Monthly Summary');

            // 2. Write Metadata across Row 1 columns
            worksheet.getRow(1).values = [
                `Month: ${meta.month}`,
                `Year: ${meta.year}`
            ];

            // Format meta text style slightly to stand out
            worksheet.getRow(1).font = { italic: true, bold: true, color: { argb: 'FF555555' } };

            // 3. Extract column header keys dynamically from the payload
            const firstRecord = rows[0];
            const headers = Object.keys(firstRecord);

            // 4. Construct Headers (Row 3)
            worksheet.getRow(3).values = headers;
            worksheet.getRow(3).font = { bold: true };

            // 5. Populate Row Data & Evaluate Individual Cell Highlights
            rows.forEach((rowData) => {
                const rowValues = headers.map(headerKey => rowData[headerKey]?.text || '');
                const excelRow = worksheet.addRow(rowValues);

                // Run down individual elements to catch conditional styles
                headers.forEach((headerKey, index) => {
                    const cellMeta = rowData[headerKey];
                    if (cellMeta && cellMeta.highlight === 1) {
                        const targetCellColIndex = index + 1; // 1-based index (Col A = 1, Col B = 2)
                        const cell = excelRow.getCell(targetCellColIndex);

                        // High-contrast soft pastel red fill style
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFFC7CE' }
                        };
                        // Dark red bold font color for high legibility
                        cell.font = {
                            color: { argb: 'FF9C0006' },
                            bold: true
                        };
                    }
                });
            });

            // 6. Polish: Dynamic Column Auto-Width & Alignment Adjustments
            headers.forEach((headerKey, index) => {
                const columnIndex = index + 1;
                const column = worksheet.getColumn(columnIndex);
                let maxTextLength = headerKey.length;

                column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
                    // Skip checking metadata row for column width evaluations
                    if (rowNumber === 1) return;

                    const currentValLength = cell.value ? String(cell.value).length : 0;
                    if (currentValLength > maxTextLength) {
                        maxTextLength = currentValLength;
                    }
                });

                if (headerKey === 'Absence Type') {
                    column.width = maxTextLength < 18 ? 18 : maxTextLength + 3;
                } else {
                    column.width = maxTextLength < 14 ? 14 : maxTextLength + 3;
                    column.alignment = { horizontal: 'center' }; // Center count values
                }
            });

            // 7. Build Final Destination Storage Path
            const isExplicitFile = path.extname(this.#path) === '.xlsx';
            const finalSavePath = isExplicitFile
                ? this.#path
                : path.join(this.#path, `Types_Monthly_Summary_Export_${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}.xlsx`);

            // 8. Stream file out to disk
            await workbook.xlsx.writeFile(finalSavePath);

            return {
                success: true,
                message: `Report successfully exported to: ${finalSavePath}`
            };

        } catch (error) {
            console.error(`Error generating types monthly matrix report: ${error}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
}