import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export class DbService {
    #db;

    constructor() {
        const filename = fileURLToPath(import.meta.url);
        const dirname = path.dirname(filename);
        this.dbPath = path.resolve(dirname, 'app.db');

        try {
            this.#db = new DatabaseSync(this.dbPath);
        } catch (error) {
            console.error(`Failed connection to DB: ${this.dbPath}`, error);
        }
    }

    /* Data Queries */
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

    getActiveSites() {
        try {
            const query = this.#db.prepare(`
                select s.id,
                       s.name
                  from sites s
                 where s.active = 'Y';
            `);
            return query.all();
        } catch (error) {
            console.log(`Error fetching active sites: ${error}`);
            return [];
        }
    }

    getActiveEmployees() {
        try {
            const query = this.#db.prepare(`
                select e.employee_id,
                       e.first_name,
                       e.last_name,
                       e.active,
                       group_concat(
                             (select title 
                                from certs 
                               where certs.id = c.certs_id),
                       ',') as certs_list,
                       group_concat(c.expiration_date, ',') as certs_expire_list
                  from employees e
                  left join certified c on c.employee_id = e.id
                 where e.active = 'Y'
                 group by e.id;
            `);
            return query.all();
        } catch (error) {
            console.error(`Error fetching all types: ${error}`);
            return [];
        }
    }

    getAbsenceTable(month, year) {
        try {
            const query = this.#db.prepare(`
            select e.id as employee_key,
                   e.employee_id,
                   e.last_name || ', ' || e.first_name as employee_name,
                   /* 1. Aggregates day to absence code (e.g. "13:E|14:PI") */
                   group_concat(
                       cast(strftime('%d', a.datetime) as integer) || ':' || 
                       case when a.type_code = 'T' then a.type_code || a.minutes else a.type_code end, 
                       '|'
                   ) as absence_codes,
                   
                   /* 2. ADD THIS: Aggregates day to corresponding comment (e.g. "13:Left early|14:Called out") */
                   group_concat(
                       cast(strftime('%d', a.datetime) as integer) || ':' || coalesce(a.comment, ''),
                       '|'
                   ) as absence_comments
              from employees e
              left join absences a
                on a.employee_id = e.id
               and cast(strftime('%m', a.datetime) as integer) = $month
               and cast(strftime('%Y', a.datetime) as integer) = $year
             where e.active = 'Y'
             group by e.id
             order by e.last_name, e.first_name, e.employee_id asc;
        `);
            return query.all({ $month: month, $year: year });
        } catch (error) {
            console.error(`Error fetching absence table data: ${error}`);
            return [];
        }
    }

    getAbsenceDayDetails(emplId, absDate) {
        try {
            const query = this.#db.prepare(`
                select a.type_code,
                       a.minutes,
                       a.comment,
                       s.name,
                       strftime('%H:%M', a.datetime ) as time
                  from absences a, sites s
                 where a.employee_id = $eid
                   and a.site_id = s.id
                   and date(a.datetime) = $dateStr
                 order by a.id;
            `);
            return query.all({ $eid: emplId, $dateStr: absDate });
        } catch (error) {
            console.error(`Error fetching absence details for date ${absDate}: ${error}`);
            return [];
        }
    }

    /* Data Insert*/

    /* Data Updates */

    /* Data Deletes */
}