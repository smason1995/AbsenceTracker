# AbsenceTracker

AbsenceTracker is an Electron desktop application for tracking employee absences, generating monthly absence summaries, and exporting reports to Excel. The app uses a local SQLite database for persistence and a React-based renderer for a responsive UI.

## Features

- Track absence entries by employee, date, type, minutes, site, and comments
- View active employees and absence matrices for selected month/year
- Generate employee summary, type monthly summary, and type daily summary views
- Export reports to Excel (`.xlsx`) using built-in export functionality
- Manage reference data for employees, sites, certifications, and absence types

## Technology Stack

- Electron
- React
- SQLite via `node:sqlite`
- Excel export with `exceljs`
- Electron Forge + Webpack
- Radix UI for popovers and dialogs

## Requirements

- Node.js 20+ (or compatible with Electron 42 runtime)
- npm

For Cross Platform compilation to Windows from Linux, ensure the following:
- Wine and Mono are are installed (required by squirrel)
- /usr/bin/wine64 exists
    - You can `sudo ln -s $(which wine) /usr/bin/wine64` if your systems makes a /usr/bin/wine instead

## Getting Started

```bash
npm install
npm start
```

This launches the Electron application in development mode.

## Packaging

Use Electron Forge to package or make distributables:

```bash
npm run package
npm run make
```

The Forge configuration is defined in `forge.config.js`, including makers for Squirrel (Windows), ZIP (macOS), DEB, and RPM.

## Project Structure

- `src/main.js` - Electron main process and IPC handlers
- `src/preload.js` - Preload script exposing secure IPC APIs to the renderer
- `src/renderer.js` - Electron renderer bootstrap
- `src/app.jsx` - Root React application component
- `src/frontend/` - UI components for headers, bodies, and icons
- `src/backend/dbservice.js` - SQLite data service for absence, employee, site, cert, and type queries
- `src/backend/exportservice.js` - Excel export service using `exceljs`
- `src/app.db` - Local SQLite database file used by the app

## Usage

1. Start the application.
2. Select a month and year.
3. Use the settings section to manage employees, absence types, certification data, and sites.
4. Enter absence details for employees in the matrix and save changes.
5. Export reports via the export controls.

## Notes

- The app exposes IPC APIs from the main process through `window.api` in the renderer.
- Database operations are handled synchronously through `DbService` with audit logging support.
- Exported Excel files are generated to the configured export path (default: user Downloads folder).

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0). See `LICENSE.txt` for details.
