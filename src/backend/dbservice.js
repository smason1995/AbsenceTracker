import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

export class DbService {
    #db;

    constructor() {
        const filename = fileURLToPath(import.meta.url);
        const dirname = path.dirname(filename);
        const localDbPath = path.resolve(dirname, 'app.db');

        const resourceDbPath = process.resourcesPath
            ? path.join(process.resourcesPath, 'app.db')
            : localDbPath;

        this.dbPath = fs.existsSync(resourceDbPath)
            ? resourceDbPath
            : localDbPath;

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

    getAllCerts() {
        try {
            const query = this.#db.prepare(`
                select id,
                       title
                  from certs
                 order by title asc;
            `);
            return query.all();
        } catch (error) {
            console.error(`Error fetching all types: ${error}`);
            return [];
        }
    }

    getAllSites() {
        try {
            const query = this.#db.prepare(`
                select s.id, 
                       s.name, 
                       s.active
                  from sites s
                 order by s.name;
            `);
            return query.all();
        } catch (error) {
            console.error(`Error fetching all sites: ${error}`);
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

    getEmployeeSummary(month, year) {
        try {
            const query = this.#db.prepare(`
                select e.id as employee_key,
                       e.last_name || ', ' || e.first_name as employee_name,
                       a.type_code,
                       count(a.type_code) as count
                  from employees e
                  left join absences a
                    on a.employee_id = e.id
                   and cast(strftime('%m', a.datetime) as integer) = $month
                   and cast(strftime('%Y', a.datetime) as integer) = $year
                 where e.active = 'Y'
                 group by e.id, a.type_code 
                 order by e.last_name, e.first_name, e.employee_id asc;
            `)
            return query.all({ $month: month, $year: year });
        } catch (error) {
            console.log(`Error fetching Employee Summary Data: ${error}`)
            return [];
        }
    }

    getTypeMonthlySummary(month, year) {
        try {
            const query = this.#db.prepare(`
                select t.code,
                       t.description,
                       count(a.type_code) as count
                  from types t
                  left join absences a  
                    on a.type_code = t.code 
                   and cast(strftime('%m', a.datetime) as integer) = $month
                   and cast(strftime('%Y', a.datetime) as integer) = $year
                 group by t.code  
                 order by t.code asc;
            `)
            return query.all({ $month: month, $year: year });
        } catch (error) {
            console.log(`Error fetching Type Monthly Summary ${month}/${year}: ${error}`)
            return [];
        }
    }

    getTypeDailySummary(month, year) {
        try {
            const query = this.#db.prepare(`
                select t.code,
                       t.description,
                       date(a.datetime) as date,
                       count(a.type_code) as count
                  from types t
                  left join absences a  
                    on a.type_code = t.code 
                   and cast(strftime('%m', a.datetime) as integer) = $month
                   and cast(strftime('%Y', a.datetime) as integer) = $year
                 group by t.code, t.description, date(a.datetime);
            `)
            return query.all({ $month: month, $year: year });
        } catch (error) {
            console.log(`Error fetching Type Daily Summary ${month}/${year}: ${error}`)
            return [];
        }
    }

    getAbsenceHighlight(queryJson) {
        try {
            const query = this.#db.prepare(`
                select a.employee_id,
                       count(a.id) as absence_count
                  from absences a
                 where date(a.datetime) between date($date, '-30 days') and date($date)
                   and a.employee_id = $id
                 group by a.employee_id
                having count(a.id) >= $count;
            `);
            return query.get({
                $id: queryJson.id,
                $date: queryJson.date,
                $count: queryJson.count
            });
        } catch (error) {
            console.log(`Error fetching highlight count: ${error}`);
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
            console.log(`Fetching absence details for employee ID ${emplId} on date ${absDate}`);
            return query.all({ $eid: emplId, $dateStr: absDate });
        } catch (error) {
            console.error(`Error fetching absence details for date ${absDate}: ${error}`);
            return [];
        }
    }

    getAllEmployees() {
        try {
            const query = this.#db.prepare(`
                select e.id,
                       e.employee_id,
                       e.first_name,
                       e.last_name,
                       e.active,
                       group_concat(c2.title || ':' || c.expiration_date || ':' || c.id, ',') as certificates
                  from employees e
                  left join certified c
                    on e.id = c.employee_id
                  left join certs c2
                    on c.certs_id = c2.id
                 group by e.id;
            `);
            const results = query.all();
            return results;
        } catch (error) {
            console.log(`Error fetching employee list: ${error}`);
            return [];
        }
    }

    /* Report Queries */
    getSingleEmployeeReport(employeeId, fullHistory, startDate, endDate) {
        try {
            const queryText = `
                select e.employee_id,
                       e.first_name || ' ' || e.last_name as employee,
                       s.name as site,
                       t.description,
                       a.minutes,
                       a.comment,
                       strftime('%m/%d/%Y', a.datetime) as absence_date,
                       strftime('%I:%M %p', a.datetime) as absence_time,
                       case 
                           when a.id is not null and 3 <= (select count(a2.id)
                                                             from absences a2
                                                            where a2.employee_id = a.employee_id
                                                              and date(a2.datetime) >= date(a.datetime, '-30 days')
                                                              and date(a2.datetime) <= date(a.datetime)) 
                           then 'Y'
                           else 'N'
                       end as limit_check
                  from employees e
                  left join absences a on e.id = a.employee_id
                    and ($fullHistory = 1 or (a.datetime >= $startDate and a.datetime <= $endDate))
                  left join sites s on a.site_id = s.id
                  left join types t on a.type_code = t.code
                 where e.id = $eid
                 order by e.first_name, e.last_name, a.datetime asc;
            `;

            const statement = this.#db.prepare(queryText);

            const results = statement.all({
                $eid: employeeId,
                $fullHistory: fullHistory ? 1 : 0,
                $startDate: startDate || null,
                $endDate: endDate || null
            });

            return results;

        } catch (error) {
            console.error(`Error fetching single employee report: ${error}`);
            return [];
        }
    }

    getActiveEmployeeReport(fullHistory, startDate, endDate) {
        try {
            const queryText = `
                select e.employee_id,
                       e.first_name || ' ' || e.last_name as employee,
                       s.name as site,
                       t.description,
                       a.minutes,
                       a.comment,
                       strftime('%m/%d/%Y', a.datetime) as absence_date,
                       strftime('%I:%M %p', a.datetime) as absence_time,
                       case 
                           when a.id is not null and 3 <= (select count(a2.id)
                                                             from absences a2
                                                            where a2.employee_id = a.employee_id
                                                              and date(a2.datetime) >= date(a.datetime, '-30 days')
                                                              and date(a2.datetime) <= date(a.datetime)) 
                           then 'Y'
                           else 'N'
                       end as limit_check
                  from employees e
                  left join absences a on e.id = a.employee_id
                    and ($fullHistory = 1 or (a.datetime >= $startDate and a.datetime <= $endDate))
                  left join sites s on a.site_id = s.id
                  left join types t on a.type_code = t.code
                 where e.active = 'Y'
                 order by e.first_name, e.last_name, a.datetime asc;
            `;

            const statement = this.#db.prepare(queryText);

            const results = statement.all({
                $fullHistory: fullHistory ? 1 : 0,
                $startDate: startDate || null,
                $endDate: endDate || null
            });

            return results;

        } catch (error) {
            console.error(`Error fetching active employee report: ${error}`);
            return [];
        }
    }

    getInactiveEmployeeReport(fullHistory, startDate, endDate) {
        try {
            const queryText = `
                select e.employee_id,
                       e.first_name || ' ' || e.last_name as employee,
                       s.name as site,
                       t.description,
                       a.minutes,
                       a.comment,
                       strftime('%m/%d/%Y', a.datetime) as absence_date,
                       strftime('%I:%M %p', a.datetime) as absence_time,
                       case 
                           when a.id is not null and 3 <= (select count(a2.id)
                                                             from absences a2
                                                            where a2.employee_id = a.employee_id
                                                              and date(a2.datetime) >= date(a.datetime, '-30 days')
                                                              and date(a2.datetime) <= date(a.datetime)) 
                           then 'Y'
                           else 'N'
                       end as limit_check
                  from employees e
                  left join absences a on e.id = a.employee_id
                    and ($fullHistory = 1 or (a.datetime >= $startDate and a.datetime <= $endDate))
                  left join sites s on a.site_id = s.id
                  left join types t on a.type_code = t.code
                 where e.active = 'N'
                 order by e.first_name, e.last_name, a.datetime asc;
            `;

            const statement = this.#db.prepare(queryText);

            const results = statement.all({
                $fullHistory: fullHistory ? 1 : 0,
                $startDate: startDate || null,
                $endDate: endDate || null
            });

            return results;

        } catch (error) {
            console.error(`Error fetching inactive employee report: ${error}`);
            return [];
        }
    }

    getAllEmployeeReport(fullHistory, startDate, endDate) {
        try {
            const queryText = `
                select e.employee_id,
                       e.first_name || ' ' || e.last_name as employee,
                       s.name as site,
                       t.description,
                       a.minutes,
                       a.comment,
                       strftime('%m/%d/%Y', a.datetime) as absence_date,
                       strftime('%I:%M %p', a.datetime) as absence_time,
                       case 
                           when a.id is not null and 3 <= (select count(a2.id)
                                                             from absences a2
                                                            where a2.employee_id = a.employee_id
                                                              and date(a2.datetime) >= date(a.datetime, '-30 days')
                                                              and date(a2.datetime) <= date(a.datetime)) 
                           then 'Y'
                           else 'N'
                       end as limit_check
                  from employees e
                  left join absences a on e.id = a.employee_id
                    and ($fullHistory = 1 or (a.datetime >= $startDate and a.datetime <= $endDate))
                  left join sites s on a.site_id = s.id
                  left join types t on a.type_code = t.code
                 order by e.first_name, e.last_name, a.datetime asc;
            `;

            const statement = this.#db.prepare(queryText);

            const results = statement.all({
                $fullHistory: fullHistory ? 1 : 0,
                $startDate: startDate || null,
                $endDate: endDate || null
            });

            return results;

        } catch (error) {
            console.error(`Error fetching all employee report: ${error}`);
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

    insertEmployee(newRecordJson) {
        try {
            const stmt = this.#db.prepare(`
                insert into employees(employee_id, first_name, last_name, active)
                values(
                    $employeeId,
                    $firstName,
                    $lastName,
                    $active);
            `)

            const result = stmt.run({
                $employeeId: newRecordJson.employee_id,
                $firstName: newRecordJson.first_name,
                $lastName: newRecordJson.last_name,
                $active: newRecordJson.active
            })

            this.#insertAuditRow('employees', result.lastInsertRowid, 'INSERT');
        } catch (error) {
            console.error(`Database core insertion failure: ${error}`);
            throw error;
        }
    }

    insertEmployeeCert(newRecordJson) {
        try {
            const stmt = this.#db.prepare(`
                insert into certified(employee_id, certs_id, expiration_date)
                values($employeeId, (select id from certs where title = $certsTitle), $expiration);
            `)

            const result = stmt.run({
                $employeeId: newRecordJson.employee_id,
                $certsTitle: newRecordJson.certs_title,
                $expiration: newRecordJson.expiration
            })

            this.#insertAuditRow('certified', result.lastInsertRowid, 'INSERT');
        } catch (error) {
            console.error(`Database core insertion failure: ${error}`);
            throw error;
        }
    }

    insertSite(newRecordJson) {
        try {
            const stmt = this.#db.prepare(`
                insert into sites(name, active)
                values($name, $active);
            `)

            const result = stmt.run({
                $name: newRecordJson.name,
                $active: newRecordJson.active
            })

            this.#insertAuditRow('sites', result.lastInsertRowid, 'INSERT');
        } catch (error) {
            console.error(`Database core insertion failure: ${error}`);
            throw error;
        }
    }

    insertCert(newRecordJson) {
        try {
            const stmt = this.#db.prepare(`
                insert into certs(title)
                values($title);
            `)

            const result = stmt.run({
                $title: newRecordJson.title
            })

            this.#insertAuditRow('certs', result.lastInsertRowid, 'INSERT');
        } catch (error) {
            console.error(`Database core insertion failure: ${error}`);
            throw error;
        }
    }

    insertType(newRecordJson) {
        try {
            const stmt = this.#db.prepare(`
                insert into types(code, description)
                values($code, $description);
            `)

            const result = stmt.run({
                $code: newRecordJson.code,
                $description: newRecordJson.description
            })

            this.#insertAuditRow('types', newRecordJson.code, 'INSERT', 'code');
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

    updateEmployee(updatedRecordJson) {
        try {
            this.#insertAuditRow('employees', updatedRecordJson.id, 'UPDATE');

            const stmt = this.#db.prepare(`
                update employees
                   set employee_id=$employeeId,
                       first_name=$firstName,
                       last_name=$lastName,
                       active=$active
                 where id=$eid;
            `);

            const result = stmt.run({
                $employeeId: updatedRecordJson.employee_id,
                $firstName: updatedRecordJson.first_name,
                $lastName: updatedRecordJson.last_name,
                $active: updatedRecordJson.active,
                $eid: updatedRecordJson.id
            })
        } catch (error) {
            console.error(`Database core update failure on ID ${updatedRecordJson.id}: ${error}`);
            throw error;
        }
    }
    updateEmployeeCert(updatedRecordJson) {
        try {
            this.#insertAuditRow('certified', updatedRecordJson.id, 'UPDATE');

            const stmt = this.#db.prepare(`     
                update certified
                   set employee_id=$employeeId,
                       certs_id=(select id from certs where title = $certsTitle),
                       expiration_date=$expiration
                 where id=$cid;
            `);

            const result = stmt.run({
                $employeeId: updatedRecordJson.employee_id,
                $certsTitle: updatedRecordJson.certs_title,
                $expiration: updatedRecordJson.expiration,
                $cid: updatedRecordJson.id
            });
        } catch (error) {
            console.error(`Database core update failure on ID ${updatedRecordJson.id}: ${error}`);
            throw error;
        }
    }
    updateSite(updatedRecordJson) {
        try {
            this.#insertAuditRow('sites', updatedRecordJson.id, 'UPDATE');

            const stmt = this.#db.prepare(`
                update sites
                   set name=$name,
                       active=$active
                 where id=$sid;
            `)

            const result = stmt.run({
                $name: updatedRecordJson.name,
                $active: updatedRecordJson.active,
                $sid: updatedRecordJson.id
            })
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

    deleteEmployeeCert(deletedRecordId) {
        try {
            this.#insertAuditRow('certified', deletedRecordId, 'DELETE');

            const stmt = this.#db.prepare(`
                delete from certified
                 where id = $id;
            `)

            const result = stmt.run({
                $id: deletedRecordId
            });
        } catch (error) {
            console.error(`Database core deletion failure on ID ${deletedRecordId}: ${error}`);
            throw error;
        }
    }
}