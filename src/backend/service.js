import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

class DbService {
    #db;

    constructor() {
        const filename = fileURLToPath(import.meta.url);
        const dirname = path.dirname(filename);
        this.dbPath = path.resolve(dirname, 'app.db');

        try {
            this.#db = new DatabaseSync(this.dbPath);
            console.log(`Successful connection to DB: ${this.dbPath}`);
        } catch (error) {
            console.error(`Failed connection to DB: ${this.dbPath}`, error);
        }
    }

    getAllTypes() {
        try {
            const query = this.#db.prepare(`
                select code,
                       description
                  from types
                 order by code asc;
                `);
            return query.all();
        } catch (error) {
            console.error(`Error fetching all types: ${error}`);
            return [];
        }
    }
}

const data = new DbService;
console.log(`
    Types:
    ${JSON.stringify(data.getAllTypes())}
    `)