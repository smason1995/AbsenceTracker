/*
 * AbsenceTracker Database Setup Script
 * 
 * Purpose: Creates a comprehensive absence tracking database with full audit trail capability
 * Author: Sydney Mason
 * Date: 2025-10-02
 * Database: SQLite 3
 * 
 * Features:
 * - Complete employee absence tracking with hierarchical person/employee relationships
 * - Immutable audit trail for all da	 values('absence_types', new.code, 'INSERT: New absence type record created');
end;

-- UPDATE PROTECTION AND AUDIT TRIGGERS
-- Purpose: Protect creation timestamps and track changes to absence type definitions

-- IMMUTABLE FIELD PROTECTION: Creation Timestamp
-- Purpose: Prevents modification of absence type creation timestamp
-- Business Rule: Creation time must remain unchanged for audit integrity
drop trigger if exists types_prevent_create_datetime_update;nges with detailed change descriptions
 * - Automatic tim	 values('tracker', new.pid, new.code, new.eid, new.occurence, 'INSERT: New tracker record created for ' || new.pid || ' for ' || new.code || ' on ' || new.occurence);
end;

-- UPDATE PROTECTION AND AUDIT TRIGGERS
-- Purpose: Protect creation timestamps and track changes to absence occurence data

-- IMMUTABLE FIELD PROTECTION: Creation Timestamp
-- Purpose: Prevents modification of tracker record creation timestamp
-- Business Rule: Creation time must remain unchanged for audit integrity
drop trigger if exists tracker_prevent_create_datetime_update; management for creation and modification tracking
 * - Data integrity protection preventing unauthorized changes to key fields
 * - Comprehensive trigger system for business rule enforcement
 * 
 * Tables: persons, employee_profile, absence_types, tracker, audit
 * Triggers: 20+ triggers for data protection, auditing, and timestamp management
 */

/*
 * ============================================================================
 * TABLE DEFINITIONS
 * ============================================================================
 * 
 * Five main tables with hierarchical relationships:
 * 1. persons - Core person identity records
 * 2. employee_profile - Employment details (one-to-many with persons)
 * 3. absence_types - Master list of absence categories
 * 4. tracker - Individual absence occurence records
 * 5. audit - Immutable log of all database changes
 */
--persons
drop table if exists persons;
create table if not exists persons (
	pid integer primary key autoincrement,                      -- Primary key: Auto-incrementing unique person identifier
	first_name text not null check (length(first_name) <= 60),  -- Required: Person's legal first name, max 60 characters
	middle_name text check (length(middle_name) <= 30),         -- Optional: Person's middle name or initial, max 30 characters
	last_name text not null check (length(last_name) <= 60),    -- Required: Person's legal last name, max 60 characters
	create_datetime text default current_timestamp,             -- System: Record creation timestamp, immutable after insert
	activity_datetime text default current_timestamp            -- System: Last modification timestamp, auto-updated by triggers
);

--------------------------------------------------------------------------------------

-- ============================================================================
-- EMPLOYEE_PROFILE TABLE
-- ============================================================================
-- Purpose: Stores employment-specific information allowing multiple employment records per person
-- Features: Unique company employee IDs, job position tracking, active status management
-- Relationships: Many-to-one with persons, one-to-many with tracker
-- Business Rules: One person can have multiple employee profiles (rehires, different positions)
drop table if exists employee_profile;
create table if not exists employee_profile(
    -- COLUMNS
    eid integer primary key autoincrement,                      -- Primary key: Auto-incrementing unique employee profile identifier
	pid integer not null,                                       -- Foreign key: Links to persons table (required)
	emp_id text unique not null,                                -- Business key: Company-assigned employee ID (must be globally unique)
	job text not null,                                          -- Required: Current job title or position description
	active_ind text not null check (active_ind in ('Y', 'N')),  -- Required: Employment status flag ('Y'=Active, 'N'=Inactive)
	create_datetime text default current_timestamp,             -- System: Record creation timestamp, immutable after insert
	activity_datetime text default current_timestamp,           -- System: Last modification timestamp, auto-updated by triggers
	-- CONSTRAINTS
	foreign key (pid) references persons(pid)                   -- Enforces referential integrity with persons table
);

--------------------------------------------------------------------------------------

--absence_types
drop table if exists absence_types;
create table if not exists absence_types (
	code text primary key not null check (length(code) <= 8),    -- Primary key: Short alphanumeric absence code, max 8 characters
	description text not null check (length(description) <= 90), -- Required: Full description of absence type, max 90 characters
	create_datetime text default current_timestamp,              -- System: Record creation timestamp, immutable after insert
	activity_datetime text default current_timestamp             -- System: Last modification timestamp, auto-updated by triggers
);

--------------------------------------------------------------------------------------

--tracker
drop table if exists tracker;
create table if not exists tracker (
	-- occurence DATA
	pid integer not null,                               -- Foreign key: Person identifier from persons table
    eid integer not null,                               -- Foreign key: Employee profile identifier from employee_profile table
	code text not null,                                 -- Foreign key: Absence type code from absence_types table
	occurence text not null,                            -- Required: Date/time when absence occurred (business key component)
	minutes integer,                                    -- Optional: Duration in minutes for tardiness or partial day absences
	comment text,                                       -- Optional: Additional notes or explanation for the absence
	-- SYSTEM FIELDS
	create_datetime text default current_timestamp,     -- System: Record creation timestamp, immutable after insert
	activity_datetime text default current_timestamp,   -- System: Last modification timestamp, auto-updated by triggers
	-- CONSTRAINTS
    primary key (pid, eid, code, occurence),            -- Composite key: Prevents duplicate absence records
	foreign key (pid) references persons(pid),          -- Enforces person exists
	foreign key (eid) references employee_profile(eid), -- Enforces employee profile exists
	foreign key (code) references absence_types(code)   -- Enforces valid absence type
);

--------------------------------------------------------------------------------------

--audit
drop table if exists audit;
create table if not exists audit(
	-- AUDIT METADATA
	aid integer primary key autoincrement,              -- Primary key: Auto-incrementing unique audit record identifier
	tablename text not null,                            -- Required: Name of table where the audited action occurred
	-- CONTEXTUAL FOREIGN KEYS (populated based on affected table)
	pid integer,                                        -- Optional: Person ID when persons, employee_profile, or tracker tables are affected
    eid integer,                                        -- Optional: Employee profile ID when employee_profile or tracker tables are affected
	code text,                                          -- Optional: Absence type code when absence_types or tracker tables are affected
	occurence text,                                     -- Optional: occurence timestamp when tracker table is affected
	-- CHANGE DETAILS
	description text,                                   -- Required: Detailed description of the change including before/after values
	create_datetime text default current_timestamp,     -- System: Timestamp when audit record was created (immutable)
	-- REFERENTIAL INTEGRITY
	foreign key (pid) references persons(pid),          -- Links to person when applicable
	foreign key (eid) references employee_profile(eid), -- Links to employee profile when applicable
	foreign key (code) references absence_types(code)   -- Links to absence type when applicable
);

--------------------------------------------------------------------------------------

/*
 * ============================================================================
 * TRIGGER DEFINITIONS
 * ============================================================================
 * 
 * Comprehensive trigger system providing:
 * 
 * 1. AUDIT TRAIL TRIGGERS
 *    - Record all INSERT, UPDATE, DELETE operations
 *    - Capture detailed before/after change descriptions
 *    - Link changes to appropriate context (person, employee, absence type)
 * 
 * 2. DATA PROTECTION TRIGGERS  
 *    - Prevent modification of primary keys and creation timestamps
 *    - Enforce business rules and data integrity
 *    - Block unauthorized changes to critical fields
 * 
 * 3. TIMESTAMP MANAGEMENT TRIGGERS
 *    - Automatically update activity_datetime on relevant changes
 *    - Only trigger on actual business field modifications
 *    - Maintain accurate change tracking
 * 
 * 4. AUDIT TABLE PROTECTION TRIGGERS
 *    - Prevent any modification or deletion of audit records
 *    - Ensure tamper-proof audit trail for compliance
 * 
 * Organization: Grouped by table (persons, employee_profile, absence_types, tracker, audit)
 */
-- ============================================================================
-- PERSONS TABLE TRIGGERS
-- ============================================================================
-- Purpose: Comprehensive data protection and audit trail for person records
-- Coverage: INSERT/UPDATE/DELETE operations with detailed change tracking
-- Protection: Immutable primary key and creation timestamp enforcement
-- INSERT AUDIT TRIGGER
-- Purpose: Logs creation of new person records in audit table
-- Fires: After successful INSERT on persons table
-- Action: Creates audit record documenting the new person creation
drop trigger if exists persons_audit_insert;
create trigger if not exists persons_audit_insert
	after insert on persons for each row
begin
	insert into audit(tablename,pid,description)
	values('persons', new.pid, 'INSERT: New person record created');
end;

-- UPDATE PROTECTION AND AUDIT TRIGGERS
-- Purpose: Protect critical fields and track business changes with detailed logging

-- IMMUTABLE FIELD PROTECTION: Primary Key
-- Purpose: Prevents any modification to person ID after record creation
-- Security: Raises abort error if pid change is attempted
drop trigger if exists persons_prevent_id_update;
create trigger if not exists persons_prevent_id_update
    before update on persons for each row
    when new.pid <> old.pid
begin
    select raise(abort, 'ERROR: Person ID (pid) is immutable and cannot be changed.');
end;
-- IMMUTABLE FIELD PROTECTION: Creation Timestamp
-- Purpose: Prevents modification of record creation timestamp
-- Business Rule: Creation time must remain unchanged for audit integrity
drop trigger if exists persons_prevent_create_datetime_update;
create trigger if not exists persons_prevent_create_datetime_update
    before update on persons for each row
    when new.create_datetime <> old.create_datetime
begin
    select raise(abort, 'ERROR: Create DateTime is immutable and cannot be changed.');
end;
-- AUTOMATIC TIMESTAMP MANAGEMENT
-- Purpose: Updates activity_datetime when business fields change
-- Efficiency: Only fires when first_name, middle_name, or last_name actually change
-- System: Prevents unnecessary timestamp updates on non-business field changes
drop trigger if exists persons_update;
create trigger if not exists persons_update
    before update on persons for each row
	when (new.first_name <> old.first_name OR 
		  new.middle_name <> old.middle_name OR 
		  new.last_name <> old.last_name)
begin
    update persons set activity_datetime = current_timestamp where pid = new.pid;
end;
-- DETAILED CHANGE AUDIT TRIGGER
-- Purpose: Creates comprehensive audit records for business field changes
-- Features: Captures before/after values with detailed change descriptions
-- Efficiency: Only triggers on actual name changes, not timestamp updates
drop trigger if exists persons_audit_update;
create trigger if not exists persons_audit_update
	after update on persons for each row
	when (new.first_name <> old.first_name OR 
		  new.middle_name <> old.middle_name OR 
		  new.last_name <> old.last_name)
begin
	insert into audit (tablename, pid, description)
	values ('persons', new.pid, 'UPDATE: Person record modified: ' ||
		trim(replace(replace(
			(case when new.first_name <> old.first_name
			 then old.first_name || ' changed to ' || new.first_name || '; '
			 else ''
			 end ||
			 case when new.middle_name <> old.middle_name
			 then old.middle_name || ' changed to ' || new.middle_name || '; '
			 else ''
			 end ||
			 case when new.last_name <> old.last_name
			 then old.last_name || ' changed to ' || new.last_name || '; '
			 else ''
			 end), '  ', ' '), '; ', ''), ';'));
end;

-- DELETE AUDIT TRIGGER
-- Purpose: Logs removal of person records for audit trail completeness
-- Context: Preserves person ID for referential audit trail integrity
drop trigger if exists persons_audit_delete;
create trigger if not exists persons_audit_delete
	after delete on persons for each row
begin
    insert into audit (tablename, pid, description)
    values ('persons', old.pid, 'DELETE: Person record removed');
end;

-- ============================================================================
-- EMPLOYEE_PROFILE TABLE TRIGGERS
-- ============================================================================
-- Purpose: Audit trail and data protection for employment records
-- Features: Tracks employment changes, protects key fields, manages timestamps
-- Special: Includes both person and employee context in audit records

-- INSERT AUDIT TRIGGER
-- Purpose: Logs creation of new employee profile records
-- Context: Records both person ID and employee ID for complete tracking
drop trigger if exists empl_audit_insert;
create trigger if not exists empl_audit_insert
	after insert on employee_profile for each row
begin
	insert into audit(tablename,pid, eid, description)
	values('employee_profile', new.pid, new.eid, 'INSERT: New employee record created');
end;

-- UPDATE PROTECTION AND AUDIT TRIGGERS
-- Purpose: Protect critical fields and track employment changes with detailed logging

-- IMMUTABLE FIELD PROTECTION: Employee Profile ID
-- Purpose: Prevents any modification to employee profile ID after record creation
-- Security: Raises abort error if eid change is attempted
drop trigger if exists empl_prevent_id_update;
create trigger if not exists empl_prevent_id_update
    before update on employee_profile for each row
    when new.eid <> old.eid
begin
    select raise(abort, 'ERROR: Employee Profile ID (eid) is immutable and cannot be changed.');
end;
-- IMMUTABLE FIELD PROTECTION: Creation Timestamp
-- Purpose: Prevents modification of employee record creation timestamp
-- Business Rule: Creation time must remain unchanged for audit integrity
drop trigger if exists empl_prevent_create_datetime_update;
create trigger if not exists empl_prevent_create_datetime_update
    before update on employee_profile for each row
    when new.create_datetime <> old.create_datetime
begin
    select raise(abort, 'ERROR: Create DateTime is immutable and cannot be changed.');
end;
-- AUTOMATIC TIMESTAMP MANAGEMENT
-- Purpose: Updates activity_datetime when employment fields change
-- Efficiency: Only fires when emp_id, job, or active_ind actually change
-- System: Prevents unnecessary timestamp updates on non-business field changes
drop trigger if exists empl_update;
create trigger if not exists empl_update
    before update on employee_profile for each row
	when (new.emp_id <> old.emp_id OR 
		  new.job <> old.job OR 
		  new.active_ind <> old.active_ind)
begin
    update employee_profile set activity_datetime = current_timestamp where eid = new.eid;
end;
-- DETAILED CHANGE AUDIT TRIGGER
-- Purpose: Creates comprehensive audit records for employment field changes
-- Features: Captures before/after values with detailed change descriptions
-- Context: Includes both person ID and employee ID for complete tracking
drop trigger if exists empl_audit_update;
create trigger if not exists empl_audit_update
	after update on employee_profile for each row
	when (new.emp_id <> old.emp_id OR 
		  new.job <> old.job OR 
		  new.active_ind <> old.active_ind)
begin
	insert into audit (tablename, pid, eid, description)
	values ('employee_profile', new.pid, new.eid, 'UPDATE: Employee record modified: ' ||
		trim(replace(replace(
			(case when new.emp_id <> old.emp_id
			 then old.emp_id || ' changed to ' || new.emp_id || '; '
			 else ''
			 end ||
			 case when new.job <> old.job
			 then old.job || ' changed to ' || new.job || '; '
			 else ''
			 end ||
			 case when new.active_ind <> old.active_ind
			 then old.active_ind || ' changed to ' || new.active_ind
			 else ''
			 end), '  ', ' '), '; ', ''), ';'));
end;

-- DELETE AUDIT TRIGGER
-- Purpose: Logs removal of employee profile records for audit trail completeness
-- Context: Preserves both person ID and employee ID for referential audit trail integrity
drop trigger if exists empl_audit_delete;
create trigger if not exists empl_audit_delete
	after delete on employee_profile for each row
begin
    insert into audit (tablename, pid, eid, description)
    values ('employee_profile', old.pid, old.eid, 'DELETE: Employee record removed');
end;

-- ============================================================================
-- ABSENCE_TYPES TABLE TRIGGERS
-- ============================================================================
-- Purpose: Audit trail and data protection for absence type master data
-- Features: Tracks changes to absence definitions, protects creation timestamps
-- Business Impact: Changes to absence types affect all historical and future absence records

-- INSERT AUDIT TRIGGER
-- Purpose: Logs creation of new absence type definitions
drop trigger if exists types_audit_insert;
create trigger if not exists types_audit_insert
	after insert on absence_types for each row
begin
	insert into audit(tablename,code,description)
	values('absence_types', new.code, 'INSERT: New absence type record created');
end;

-- UPDATE PROTECTION AND AUDIT TRIGGERS
-- Purpose: Protect creation timestamps and track changes to absence type definitions

-- IMMUTABLE FIELD PROTECTION: Creation Timestamp
-- Purpose: Prevents modification of absence type creation timestamp
-- Business Rule: Creation time must remain unchanged for audit integrity
drop trigger if exists types_prevent_create_datetime_update;
create trigger if not exists types_prevent_create_datetime_update
    before update on absence_types for each row
    when new.create_datetime <> old.create_datetime
begin
    select raise(abort, 'ERROR: Create DateTime is immutable and cannot be changed.');
end;
-- AUTOMATIC TIMESTAMP MANAGEMENT
-- Purpose: Updates activity_datetime when absence type description changes
-- Efficiency: Only fires when description field actually changes
-- Impact: Critical for tracking changes to master absence definitions
drop trigger if exists types_update;
create trigger if not exists types_update
    before update on absence_types for each row
	when new.description <> old.description
begin
    update absence_types set activity_datetime = current_timestamp where code = new.code;
end;
-- DETAILED CHANGE AUDIT TRIGGER
-- Purpose: Creates audit records for absence type definition changes
-- Features: Captures before/after description values
-- Impact: Critical for tracking changes that affect all absence records
drop trigger if exists types_audit_update;
create trigger if not exists types_audit_update
	after update on absence_types for each row
	when new.description <> old.description
begin
	insert into audit (tablename, code, description)
	values ('absence_types', new.code, 'UPDATE: Absence type record modified: ' || old.description || ' changed to ' || new.description);
end;

-- DELETE AUDIT TRIGGER
-- Purpose: Logs removal of absence type definitions
-- Context: Preserves absence type code for referential audit trail integrity
drop trigger if exists types_audit_delete;
create trigger if not exists types_audit_delete
	after delete on absence_types for each row
begin
    insert into audit (tablename, code, description)
    values ('absence_types', old.code, 'DELETE: Absence type record removed');
end;


-- ============================================================================
-- TRACKER TABLE TRIGGERS
-- ============================================================================
-- Purpose: Comprehensive audit trail for individual absence occurence records
-- Features: Tracks all absence data changes with full context preservation
-- Complexity: Handles composite primary key and multiple foreign key relationships

-- INSERT AUDIT TRIGGER
-- Purpose: Logs creation of new absence occurence records
-- Context: Captures person, employee, absence type, and occurence details
drop trigger if exists tracker_audit_insert;
create trigger if not exists tracker_audit_insert
	after insert on tracker for each row
begin
	insert into audit(tablename, pid, code, eid, occurence, description)
	values('tracker', new.pid, new.code, new.eid, new.occurence, 'INSERT: New tracker record created for ' || new.pid || ' for ' || new.code || ' on ' || new.occurence);
end;

-- UPDATE PROTECTION AND AUDIT TRIGGERS
-- Purpose: Protect creation timestamps and track changes to absence occurence data

-- IMMUTABLE FIELD PROTECTION: Creation Timestamp
-- Purpose: Prevents modification of tracker record creation timestamp
-- Business Rule: Creation time must remain unchanged for audit integrity
drop trigger if exists tracker_prevent_create_datetime_update;
create trigger if not exists tracker_prevent_create_datetime_update
    before update on tracker for each row
    when new.create_datetime <> old.create_datetime
begin
    select raise(abort, 'ERROR: Create DateTime is immutable and cannot be changed.');
end;

-- AUTOMATIC TIMESTAMP MANAGEMENT
-- Purpose: Updates activity_datetime when absence occurence data changes
-- Efficiency: Only fires when occurence, minutes, or comment fields actually change
-- Precision: Uses complete composite primary key for exact record targeting
drop trigger if exists tracker_update;
create trigger if not exists tracker_update
    before update on tracker for each row
	when (new.occurence <> old.occurence OR 
		  new.minutes <> old.minutes OR 
		  new.comment <> old.comment)
begin
    update tracker set activity_datetime = current_timestamp where pid = new.pid and code = new.code and eid = new.eid and occurence = new.occurence;
end;
-- DETAILED CHANGE AUDIT TRIGGER
-- Purpose: Creates comprehensive audit records for absence occurence changes
-- Features: Captures before/after values with detailed change descriptions
-- Context: Includes person, employee, absence type, and occurence for complete tracking
drop trigger if exists tracker_audit_update;
create trigger if not exists tracker_audit_update
	after update on tracker for each row
	when (new.occurence <> old.occurence OR 
		  new.minutes <> old.minutes OR 
		  new.comment <> old.comment)
begin
	insert into audit (tablename, pid, code, eid, occurence, description)
	values ('tracker', new.pid, new.code, new.eid, new.occurence, 'UPDATE: Tracker record modified: ' ||
		trim(replace(replace(
			(case when new.occurence <> old.occurence
			 then old.occurence || ' changed to ' || new.occurence || '; '
			 else ''
			 end ||
			 case when new.minutes <> old.minutes
			 then old.minutes || ' changed to ' || new.minutes || '; '
			 else ''
			 end ||
			 case when new.comment <> old.comment
			 then old.comment || ' changed to ' || new.comment
			 else ''
			 end), '  ', ' '), '; ', ''), ';'));
end;

-- DELETE AUDIT TRIGGER
-- Purpose: Logs removal of absence occurence records
-- Context: Preserves complete context (person, employee, absence type, occurence) for audit trail
drop trigger if exists tracker_audit_delete;
create trigger if not exists tracker_audit_delete
	after delete on tracker for each row
begin
    insert into audit (tablename, pid, code, eid, occurence, description)
    values ('tracker', old.pid, old.code, old.eid, old.occurence, 'DELETE: Tracker record removed');
end;


-- ============================================================================
-- AUDIT TABLE PROTECTION TRIGGERS
-- ============================================================================
-- Purpose: Ensures complete immutability of audit records for compliance
-- Security: Prevents ANY modification or deletion of audit trail data
-- Compliance: Maintains tamper-proof audit log for regulatory requirements

-- UPDATE PREVENTION TRIGGER
-- Purpose: Blocks all attempts to modify existing audit records
-- Action: Raises abort error with detailed compliance message
drop trigger if exists audit_prevent_update;
create trigger if not exists audit_prevent_update
	before update on audit for each row
begin
	select raise(abort, 'ERROR: Audit table is immutable - UPDATE operations are not allowed. Audit records cannot be modified to maintain data integrity.');
end;

-- DELETE PREVENTION TRIGGER
-- Purpose: Blocks all attempts to delete audit records
-- Compliance: Ensures permanent audit trail for regulatory requirements
-- Action: Raises abort error with detailed compliance message
drop trigger if exists audit_prevent_delete;
create trigger if not exists audit_prevent_delete
	before delete on audit for each row
begin
	select raise(abort, 'ERROR: Audit table is immutable - DELETE operations are not allowed. Audit records cannot be deleted to maintain compliance.');
end;