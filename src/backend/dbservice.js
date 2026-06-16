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

    /* Audit Record Insert */
    #insertAuditRow(table, key, action, idColumn = 'id') {
        try {
            // 1. Prepare and execute the select statement. 
            // node:sqlite automatically converts row records into clean JS objects.
            const selectQuery = this.#db.prepare(`
            SELECT t.* FROM ${table} t WHERE t.${idColumn} = $key;
        `);
            const rowData = selectQuery.get({ $key: key });

            if (!rowData) {
                console.warn(`Audit warning: Row with ${idColumn} = ${key} not found in table "${table}".`);
                return;
            }

            // 2. Serialize the row object to a JSON string agnostically
            const serializedRow = JSON.stringify(rowData);
            const comment = `${action} ${serializedRow}`;

            // 3. Prepare and run the insert statement
            const auditInsert = this.#db.prepare(`
            INSERT INTO audit (table_name, change_comment)
            VALUES ('${table}', $comment);
        `);
            auditInsert.run({ $comment: comment });

        } catch (error) {
            console.error(`Error inserting Audit record for table "${table}": ${error}`);
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
                select a.id,
                       a.type_code,
                       a.minutes,
                       a.comment,
                       s.name,
                       strftime('%H:%M', a.datetime ) as time
                  from absences a
                  join sites s on a.site_id = s.id
                 where a.employee_id = $eid
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
    insertAbsence(newRecordJson) {
        try {
            const stmt = this.#db.prepare(`
                insert into absences (employee_id, type_code, minutes, comment, site_id, datetime, modify_date)
                values (
                    $employeeId,
                    $typeCode,
                    $minutes,
                    $comment,
                    (select id from sites where name = $siteName limit 1),
                    $dateStr || ' ' || coalesce($timeStr, '00:00') || ':00',
                    date('now','localtime')
                );
            `);

            // Execute the statement and capture changes status metadata
            const result = stmt.run({
                $employeeId: newRecordJson.employee_id || newRecordJson.employee_key,
                $typeCode: newRecordJson.type_code || null,
                // Only save minutes value if type code is 'T' (Timebound)
                $minutes: newRecordJson.type_code === 'T' && newRecordJson.minutes ? parseInt(newRecordJson.minutes, 10) : null,
                $comment: newRecordJson.comment || null,
                $siteName: newRecordJson.name || null,
                $dateStr: newRecordJson.date, // Expected format: 'YYYY-MM-DD'
                $timeStr: newRecordJson.time || '00:00'
            });

            this.#insertAuditRow('absences', result.lastInsertRowid, 'INSERT');

            return result;
        } catch (error) {
            console.error(`Database core insertion failure: ${error}`);
            throw error;
        }
    }

    /* Data Updates */
    updateAbsence(updatedRecordJson) {
        try {
            this.#insertAuditRow('absences', updatedRecordJson.id, 'UPDATE');

            const stmt = this.#db.prepare(`
                update absences
                   set type_code = $typeCode,
                       minutes = $minutes,
                       comment = $comment,
                       site_id = (select id from sites where name = $siteName limit 1),
                       datetime = $dateStr || ' ' || coalesce($timeStr, '00:00') || ':00',
                       modify_date = date('now','localtime')
                 where id = $id;
            `);

            const result = stmt.run({
                $typeCode: updatedRecordJson.type_code || null,
                $minutes: updatedRecordJson.type_code === 'T' && updatedRecordJson.minutes ? parseInt(updatedRecordJson.minutes, 10) : null,
                $comment: updatedRecordJson.comment || null,
                $siteName: updatedRecordJson.name || null,
                $dateStr: updatedRecordJson.date, // Expected format: 'YYYY-MM-DD'
                $timeStr: updatedRecordJson.time || '00:00',
                $id: updatedRecordJson.id
            });

            return result;
        } catch (error) {
            console.error(`Database core update failure on ID ${updatedRecordJson.id}: ${error}`);
            throw error;
        }
    }

    /* Data Deletes */
    deleteAbsence(deletedRecordId) {
        try {
            this.#insertAuditRow('absences', deletedRecordId, 'DELETE');

            const stmt = this.#db.prepare(`
                delete from absences
                 where id = $id;
            `);

            const result = stmt.run({
                $id: deletedRecordId
            });

            return result;
        } catch (error) {
            console.error(`Database core deletion failure on ID ${deletedRecordId}: ${error}`);
            throw error;
        }
    }
}