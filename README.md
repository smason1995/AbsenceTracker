# Absence Tracker

## IMPORTANT
Migrating from using JSON files to store data with all management on application side to SQLite to separate data storage and manage from the application more clearly, as well as increasing performance for various features when under heavy loads.

### Description
This application is designed to track absences and give high level reporting capabilities on absences. Originally made to help a friend manage employees, this app is flexible enough to be used in many absence contexts.

It is built using NodeJS using an Electron, Vite, and React architecture. The releases are made with Electron Builder, and are supplied as standalone applications (i.e. no install required). It manages data with two JSON files inside the root level of the application folder.

If you would like to build from source, you will need to do the following

#### Requirements
|Software|Version|
|:--------:|:-------:|
|NodeJS|>= V22.17.0|
|NPM|>= V11.4.2|

#### Steps
- Clone the repository from Github
- Go into the source/ folder
- Run `npm install`
- Create a dist-electron/ folder
- Copy dist/ assets/ main.js to dist-electron/
- Run `npm run exe:build` as Admin
- Copy assets/ into /dist/win-unpacked (note: this folder is the standalone version)

Note: At this time, the application only supports Windows builds (made it for friend originally, might add Linux and Mac at a later date)

#### TODO:
- Fix known bug that breaks a couple user input fields (requires app restart to resolve)
- Remove manual folder/file placements from the build process
- Cleanup up the UI

#### Legal
This application is licensed using GPL Version 3
