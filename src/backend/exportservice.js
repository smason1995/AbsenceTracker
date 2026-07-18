const { exec } = require('node:child_process');
const os = require('os');
const path = require('node:path');
const ExcelJS = require('exceljs');

class ExportService {
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
      * Takes nested metadata and table row JSON and creates an Excel Workbook
      * @param {Object} tableJson - The updated metadata and data structure
      * @returns {Promise<Object>} success or error notification
      */
    async exportTableToWorkbook(tableJson) {
        try {
            // 0. #path check
            if (!this.#path) {
                return {
                    success: false,
                    error: `File path is invalid: ${this.#path}`
                };
            }

            // Structure Guard Clause
            if (!tableJson || !tableJson.data || tableJson.data.length === 0) {
                return {
                    success: false,
                    error: "Invalid or empty data structure provided."
                };
            }

            // 1. Initialize new workbook and sheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Types Monthly Summary');

            // Helper to convert English color words or Hex to ARGB
            const getArgbColor = (colorStr) => {
                if (!colorStr) return null;
                const namedColors = {
                    'red': 'FFFF0000', 'green': 'FF008000', 'blue': 'FF0000FF',
                    'yellow': 'FFFFFF00', 'orange': 'FFA50000', 'gray': 'FF808080'
                };
                const cleanColor = String(colorStr).trim().toLowerCase();
                if (namedColors[cleanColor]) return namedColors[cleanColor];

                let hex = cleanColor.replace('#', '');
                return hex.length === 6 ? 'FF' + hex.toUpperCase() : hex.toUpperCase();
            };

            // 2. Add Meta Header Row (Row 1 of your CSV/Excel output)
            const meta = tableJson.meta || {};
            const reportPeriod = meta.report_period || {};
            worksheet.addRow([
                'Report Month:', reportPeriod.month || '',
                'Report Year:', reportPeriod.year || ''
            ]);

            // 3. Generate Column Headers Row (Row 2 of your CSV/Excel output)
            // Dynamically build headers based on the first employee's day count
            const firstRecordDays = tableJson.data[0].days || [];
            const headers = ['Employee Name'];
            firstRecordDays.forEach(day => {
                headers.push(`Day ${day.index}`);
            });
            worksheet.addRow(headers);

            // 4. Process Data Rows (Row 3 onwards)
            tableJson.data.forEach(employee => {
                if (!employee || typeof employee !== 'object') return;

                // Index 0 of row array maps to Column 1 (A) in Excel
                const rowValues = [employee.name || ''];
                const targetedStyles = [];

                const days = employee.days || [];
                days.forEach(day => {
                    // Push string codes ('C', 'E', 'T6|Y') into subsequent columns
                    rowValues.push(day.code || '');

                    // Track structural color offsets
                    // Since Column 1 is Name, Day 1 sits at Excel Column index 2 (B)
                    if (day._cellBg) {
                        targetedStyles.push({
                            columnIndex: day.index + 1,
                            color: day._cellBg
                        });
                    }
                });

                // Write the flat layout array into the next available row slot
                const excelRow = worksheet.addRow(rowValues);

                // Apply cell-specific backgrounds recorded during assembly
                targetedStyles.forEach(style => {
                    const cell = excelRow.getCell(style.columnIndex);
                    const argbColor = getArgbColor(style.color);
                    if (argbColor) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: argbColor }
                        };
                    }
                });
            });

            // 5. Write file to #path
            await workbook.xlsx.writeFile(this.#path);

            return {
                success: true,
                message: `File saved to ${this.#path}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Takes SQL Query JSON from DB Service and creates Excell Workbook
     * @param {*} reportJson, DB Service query JSON 
     * @param {*} path, filepath to place export
     * @returns, success or error notification 
     */
    async exportReport(reportJson, path) {
        return {};
    }

    /**
     * Takes combined JSON of all HTML DOM <table> and creates Excel Workbook
     * @param {*} tablesJson, HTML DOM JSON of all tables from bodies.jsx 
     * @param {*} path, filepath to place export
     * @returns, success or error notification
     */
    async exportAllTablesToWorkbook(tablesJson, path) {
        return {};
    }
}

module.exports = ExportService;