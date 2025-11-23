import { useState, useRef } from 'react'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
dayjs.extend(isBetween)
import './App.css'
import html2canvas from 'html2canvas'

// Electron/Node.js file system access
const fs = window.require('fs')
const path = window.require('path')

// --- Utility Functions ---
/** Returns array of day strings for a given month/year */
function GetDaysArray(monthIndex, year) {
  const daysInMonth = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`).daysInMonth()
  return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'))
}

/** Returns date string in YYYY-MM-DD format */
function GetDateString(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day}`
}

// --- Table Components ---
/** Employee Absence Table */
function AbsenceTable({ absenceData, daysInMonth, month, year, onCellClick }) {
  const months = Array.from({ length: 12 }, (_, i) => dayjs().month(i).format('MMMM'))
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto', display: 'block' }}>
      <thead>
        <tr>
          <th className="sticky-col" style={{ minWidth: '140px', whiteSpace: 'nowrap', top: 0, left: 0, zIndex: 3 }}>Employee</th>
          {daysInMonth.map(day => (
            <th className="sticky-col" key={day} style={{ minWidth: '48px', whiteSpace: 'nowrap', top: 0, zIndex: 2 }}>{day}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {absenceData.filter(emp => emp.active).map(emp => (
          <tr key={emp.employeeId}>
            <td className="sticky-col" style={{ minWidth: '140px', whiteSpace: 'nowrap', left: 0, zIndex: 1 }}>{emp.name}</td>
            {daysInMonth.map(day => {
              const dateStr = GetDateString(year, months.indexOf(month), day)
              const absencesForDay = emp.absences?.filter(a => a.date === dateStr) || []
              const absenceCodes = absencesForDay.map(a =>
                a.code && a.code.startsWith('T') && a.minutes
                  ? `${a.code}${a.minutes}`
                  : a.code
              ).join('|')
              const absenceComments = absencesForDay.map(a => a.comment).filter(Boolean).join('; ')
              return (
                <td
                  key={day}
                  title={absenceComments}
                  style={{ minWidth: '48px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                  onClick={() => onCellClick(emp.name, day, absenceCodes, absenceComments)}
                >
                  {absenceCodes}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Absence Summary Table */
function AbsenceSummaryTable({ absenceData, absenceCodes, month, year }) {
  const months = Array.from({ length: 12 }, (_, i) => dayjs().month(i).format('MMMM'))
  const monthIndex = months.indexOf(month)
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto', display: 'block' }}>
      <thead>
        <tr>
          <th className="sticky-col" style={{ minWidth: '140px', whiteSpace: 'nowrap', border: '1px solid #ccc', padding: '4px', top: 0, left: 0, zIndex: 3 }}>Employee</th>
          {absenceCodes.map(opt => (
            <th
              className='sticky-col'
              key={opt.code}
              style={{ minWidth: '80px', whiteSpace: 'nowrap', border: '1px solid #ccc', padding: '4px', top: 0, zIndex: 2 }}
            >
              {opt.value}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {absenceData.filter(emp => emp.active).map(emp => (
          <tr key={emp.employeeId}>
            <td className="sticky-col" style={{ minWidth: '140px', whiteSpace: 'nowrap', border: '1px solid #ccc', padding: '4px', left: 0, zIndex: 1 }}>{emp.name}</td>
            {absenceCodes.map(opt => {
              const count = emp.absences
                ?.filter(a => {
                  const date = dayjs(a.date)
                  return (
                    a.code === opt.code &&
                    date.year().toString() === year &&
                    date.month() === monthIndex
                  )
                }).length || 0
              return (
                <td
                  key={opt.code}
                  style={{ minWidth: '80px', whiteSpace: 'nowrap', border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}
                >
                  {count}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Daily Absence Tally Table */
function DailyAbsenceTallyTable({ absenceData, absenceCodes, daysInMonth, month, year }) {
  const months = Array.from({ length: 12 }, (_, i) => dayjs().month(i).format('MMMM'))
  const monthIndex = months.indexOf(month)

  // Helper: tally for each code and day
  function getTally(code, day) {
    const dateStr = GetDateString(year, monthIndex, day)
    return absenceData.reduce((sum, emp) => {
      if (!emp.active || !emp.absences) return sum
      return sum + emp.absences.filter(a => a.date === dateStr && a.code === code).length
    }, 0)
  }

  return (
    <table style={{ marginTop: '2rem', borderCollapse: 'collapse', maxWidth: '100%', overflowX: 'auto', display: 'block' }}>
      <thead>
        <tr>
          <th className="sticky-col" style={{ minWidth: '100px', whiteSpace: 'nowrap', border: '1px solid #ccc', padding: '4px', top: 0, left: 0, zIndex: 3 }}>Absence Code</th>
          {daysInMonth.map(day => (
            <th key={day} style={{ minWidth: '48px', whiteSpace: 'nowrap', border: '1px solid #ccc', padding: '4px', zIndex: 2 }}>{day}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {absenceCodes.map(opt => (
          <tr key={opt.code}>
            <td className="sticky-col" style={{ minWidth: '100px', whiteSpace: 'nowrap', border: '1px solid #ccc', padding: '4px', left: 0, zIndex: 1 }}>{opt.code}</td>
            {daysInMonth.map(day => (
              <td
                key={day}
                style={{ minWidth: '48px', whiteSpace: 'nowrap', border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}
              >
                {getTally(opt.code, day)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Absence Edit Popup */
function AbsencePopup({
  popupInfo,
  editAbsences,
  absenceCodes,
  handleAbsenceChange,
  handleAddAbsence,
  handleDeleteAbsence,
  handleSaveAbsences,
  handleCancel
}) {
  return (
    <div className='popup'>
      <h3>Edit Absences</h3>
      <p><strong>Employee:</strong> {popupInfo.employee}</p>
      <p><strong>Day:</strong> {popupInfo.day}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto', display: 'block' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '4px' }}>Code</th>
            <th style={{ border: '1px solid #ccc', padding: '4px' }}>Minutes</th>
            <th style={{ border: '1px solid #ccc', padding: '4px' }}>Comment</th>
          </tr>
        </thead>
        <tbody>
          {editAbsences.map((absence, idx) => (
            <tr key={`${absence.date}-${absence.code}-${idx}`}>
              <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                <select
                  value={absence.code}
                  onChange={e => handleAbsenceChange(idx, 'code', e.target.value)}
                >
                  <option value="">Select code</option>
                  {absenceCodes.map(opt => (
                    <option key={opt.code} value={opt.code}>{opt.code}</option>
                  ))}
                </select>
              </td>
              <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                <input
                  type="number"
                  min="0"
                  value={absence.code && absence.code.startsWith('T') ? absence.minutes || '' : ''}
                  disabled={!absence.code || !absence.code.startsWith('T')}
                  onChange={e => handleAbsenceChange(idx, 'minutes', e.target.value)}
                  placeholder="Minutes"
                />
              </td>
              <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                <input
                  type="text"
                  value={absence.comment || ''}
                  onChange={e => handleAbsenceChange(idx, 'comment', e.target.value)}
                  placeholder="Enter comment"
                />
              </td>
              <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                <button onClick={() => handleDeleteAbsence(idx)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={handleAddAbsence}>Add Absence</button>{' '}
      <button onClick={handleSaveAbsences}>Save</button>{' '}
      <button onClick={handleCancel}>Cancel</button>
    </div>
  )
}

/** Export Data Popup */
function ExportDataPopup({ absenceData, onClose }) {
  const [exportType, setExportType] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [historyType, setHistoryType] = useState('full')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState('')

  const months = Array.from({ length: 12 }, (_, i) => dayjs().month(i).format('MMMM'))
  const years = Array.from(new Set(absenceData.flatMap(emp => emp.absences?.map(a => dayjs(a.date).year().toString()) || [])))

  function handleExport() {
    if (exportType === 'employee' && selectedEmployee) {
      const emp = absenceData.find(e => e.name === selectedEmployee)
      if (!emp) return
      let absences = emp.absences || []
      if (historyType === 'range' && startDate && endDate) {
        absences = absences.filter(a => dayjs(a.date).isBetween(startDate, endDate, null, '[]'))
      }
      const headers = ['Employee Name', 'Employee ID', 'Active', 'Absence Date', 'Absence Code', 'Minutes', 'Comment']
      const rows = absences.length
        ? absences.map(a => ({
          'Employee Name': emp.name,
          'Employee ID': emp.employeeId,
          'Active': emp.active ? 'Active' : 'Inactive',
          'Absence Date': a.date,
          'Absence Code': a.code,
          'Minutes': a.minutes || '',
          'Comment': a.comment || ''
        }))
        : [{
          'Employee Name': emp.name,
          'Employee ID': emp.employeeId,
          'Active': emp.active ? 'Active' : 'Inactive',
          'Absence Date': '',
          'Absence Code': '',
          'Minutes': '',
          'Comment': ''
        }]
      const escape = v => `"${String(v).replace(/"/g, '""')}"`

      // --- Summary Section ---
      // Tally absences by code
      const summary = {}
      absences.forEach(a => {
        summary[a.code] = (summary[a.code] || 0) + 1
      })
      const summaryHeaders = ['Absence Code', 'Count']
      const summaryRows = Object.entries(summary).map(([code, count]) =>
        [escape(code), escape(count)].join(',')
      )

      const csv = [
        headers.map(escape).join(','),
        ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
        '', '', // blank line before summary
        '"Absence Type Summary"',
        summaryHeaders.map(escape).join(','),
        ...summaryRows
      ].join('\r\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${emp.name}_${historyType === 'full' ? 'history' : `${startDate}_to_${endDate}`}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onClose()
    }
    if (exportType === 'month' && selectedMonth && selectedYear) {
      const monthIndex = months.indexOf(selectedMonth)
      const daysInMonth = GetDaysArray(monthIndex, selectedYear)
      const headers = ['Employee Name', ...daysInMonth]
      const rows = absenceData.filter(emp => emp.active).map(emp => {
        const row = { 'Employee Name': emp.name }
        daysInMonth.forEach(day => {
          const dateStr = GetDateString(selectedYear, monthIndex, day)
          const absencesForDay = emp.absences?.filter(a => a.date === dateStr) || []
          row[day] = absencesForDay.map(a =>
            a.code && a.code.startsWith('T') && a.minutes
              ? `${a.code}${a.minutes}`
              : a.code
          ).join('|')
        })
        return row
      })
      const escape = v => `"${String(v).replace(/"/g, '""')}"`
      const csv = [
        headers.map(escape).join(','),
        ...rows.map(row => headers.map(h => escape(row[h])).join(','))
      ].join('\r\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `absence_month_${selectedMonth}_${selectedYear}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    if (exportType === 'png') {
      if (!screenRef.current) {
        alert('Screen reference is not set. Please ensure the component is rendered correctly.');
        return;
      }

      const element = screenRef.current;

      // Save original styles
      const originalOverflow = element.style.overflow;
      const originalWidth = element.style.width;
      const originalHeight = element.style.height;

      // Expand to full scrollable size
      element.style.overflow = 'visible';
      element.style.width = `${element.scrollWidth}px`;
      element.style.height = `${element.scrollHeight}px`;

      html2canvas(element, {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      }).then(canvas => {
        // Restore original styles
        element.style.overflow = originalOverflow;
        element.style.width = originalWidth;
        element.style.height = originalHeight;

        const imgData = canvas.toDataURL('image/png');

        // Trigger download
        const link = document.createElement('a');
        link.href = imgData;
        link.download = 'absence_tables.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }).catch(err => {
        console.error('Error exporting PNG:', err);
        alert('Failed to generate image. Please try again.');
        // Restore styles on error
        element.style.overflow = originalOverflow;
        element.style.width = originalWidth;
        element.style.height = originalHeight;
      });
    }

    onClose()
  }

  return (
    <div className='popup'>
      <h3>Export Data</h3>
      <label>
        Export Type:&nbsp;
        <select value={exportType} onChange={e => setExportType(e.target.value)}>
          <option value="">Select type</option>
          <option value="employee">Employee</option>
          <option value="month">Month</option>
          <option value="png">Tables View</option>
        </select>
      </label>
      <br /><br />
      {exportType === 'employee' && (
        <>
          <label>
            Employee:&nbsp;
            <select
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              style={{ minWidth: '180px' }}
            >
              <option value="">Select employee</option>
              {absenceData.map(emp => (
                <option key={emp.employeeId} value={emp.name}>{emp.name}</option>
              ))}
            </select>
          </label>
          <br /><br />
          <label>
            <input
              type="radio"
              name="historyType"
              value="full"
              checked={historyType === 'full'}
              onChange={() => setHistoryType('full')}
            /> Full History
          </label>
          <label style={{ marginLeft: '1rem' }}>
            <input
              type="radio"
              name="historyType"
              value="range"
              checked={historyType === 'range'}
              onChange={() => setHistoryType('range')}
            /> Date Range
          </label>
          {historyType === 'range' && (
            <div style={{ marginTop: '0.5rem' }}>
              <label>
                Start Date:&nbsp;
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </label>
              <label style={{ marginLeft: '1rem' }}>
                End Date:&nbsp;
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </label>
            </div>
          )}
        </>
      )}
      {exportType === 'month' && (
        <>
          <label>
            Month:&nbsp;
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="">Select month</option>
              {months.map((m, idx) => (
                <option key={idx} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <label style={{ marginLeft: '1rem' }}>
            Year:&nbsp;
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="">Select year</option>
              {years.map((y, idx) => (
                <option key={idx} value={y}>{y}</option>
              ))}
            </select>
          </label>
        </>
      )}
      {exportType === 'png' && (
        <>
          <p>Click the button below to generate a PNG of the absence tables.</p>
        </>
      )}
      <br /><br />
      <button
        disabled={
          (exportType === 'employee' && !selectedEmployee) ||
          (exportType === 'employee' && historyType === 'range' && (!startDate || !endDate)) ||
          (exportType === 'month' && (!selectedMonth || !selectedYear))
        }
        onClick={handleExport}
      >
        Export
      </button>{' '}
      <button onClick={onClose}>Cancel</button>
    </div>
  )
}

/** Manage JSON Files Popup */
function ManageJsonFilesPopup({ absenceData, setAbsenceData, onClose }) {
  const [fileType, setFileType] = useState('')
  const [newEmployeeName, setNewEmployeeName] = useState('')
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [newEmployeeActive, setNewEmployeeActive] = useState(true)
  const [absenceCodes, setAbsenceCodes] = useState(absenceCodes)
  const [newAbsenceCode, setNewAbsenceCode] = useState('')
  const [newAbsenceValue, setNewAbsenceValue] = useState('')

  console.log('Initial Employees:', absenceData)

  // Handler for adding a new employee
  function handleAddEmployee() {
    const newId = absenceData.length > 0 ? Math.max(...absenceData.map(emp => emp.employeeId)) + 1 : 1
    setNewEmployeeId(newId.toString())
    if (!newEmployeeName || !newEmployeeId) return
    setAbsenceData(prev => [...prev, {
      name: newEmployeeName,
      employeeId: newEmployeeId,
      active: newEmployeeActive,
      absences: []
    }])
    setNewEmployeeName('')
    setNewEmployeeId('')
    setNewEmployeeActive(true)
  }

  // Handler for adding a new absence code
  function handleAddAbsenceCode() {
    if (!newAbsenceCode || !newAbsenceValue) return
    absenceCodes.push({ code: newAbsenceCode, value: newAbsenceValue })
    setNewAbsenceCode('')
    setNewAbsenceValue('')
  }

  // Handler to deleting an absence type
  function handleDeleteAbsenceCode(index) {
    if (window.confirm('Are you sure you want to delete this absence code?')) {
      setAbsenceCodes(prev => prev.filter((_, i) => i !== index))
      alert('Absence code deleted successfully!')
    }
  }

  // Button handler to save current absenceData and codeData to JSON files
  function handleSaveJsonFiles() {
    //console.log('Employees to save:', employees)
    console.log('Tracker Data:', absenceData)
    try {
      console.log("Saving absence data to:", absenceFilePath);
      fs.writeFileSync(
        absenceFilePath,
        JSON.stringify(absenceData, null, 2),
        'utf-8'
      );
      console.log('Absence file saved successfully.');
      fs.writeFileSync(
        absenceCodesFilePath,
        JSON.stringify(absenceCodes, null, 2),
        'utf-8')
      alert('JSON files updated successfully!');
      onClose();
    } catch (err) {
      alert('Failed to save JSON files: ' + err.message);
      console.error(err);
    }
  }

  return (
    <div className='popup'>
      <h3>Manage Data Files</h3>
      <label>
        File Type:&nbsp;
        <select value={fileType} onChange={e => setFileType(e.target.value)}>
          <option value="">Select type</option>
          <option value="Employees">Employees</option>
          <option value="Absence Types">Absence Types</option>
        </select>
      </label>
      <br /><br />
      {fileType === 'Employees' && (
        <>
          <h4>Employees</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto', display: 'block' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Name</th>
                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Employee ID</th>
                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Active</th>
              </tr>
            </thead>
            <tbody>
              {absenceData.map((emp, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{emp.name}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{emp.employeeId}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                    <select
                      value={emp.active ? 'Active' : 'Inactive'}
                      onChange={e => {
                        const updatedEmployees = [...absenceData]
                        updatedEmployees[idx].active = e.target.value === 'Active'
                        setAbsenceData(updatedEmployees)
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <label>
            Name:&nbsp;
            <input
              type="text"
              value={newEmployeeName}
              onChange={e => setNewEmployeeName(e.target.value)}
              placeholder="Enter employee name"
            />
          </label>
          <br />
          <label>
            Active:&nbsp;
            <input
              type="checkbox"
              checked={newEmployeeActive}
              onChange={e => setNewEmployeeActive(e.target.checked)}
            />
          </label>
          <br />
          <button onClick={handleAddEmployee}>Add Employee</button>
          <br /><br />
          <p>Note: Employee IDs will be autogenerated.</p>
        </>
      )}
      {fileType === 'Absence Types' && (
        <>
          <h4>Absence Types</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto', display: 'block' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Code</th>
                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Type</th>
                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {absenceCodes.map((code, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{code.code}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>{code.value}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                    <button onClick={() => handleDeleteAbsenceCode(idx)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <label>
            Code:&nbsp;
            <input
              type="text"
              value={newAbsenceCode}
              onChange={e => setNewAbsenceCode(e.target.value)}
              placeholder="Enter absence code"
            />
          </label>
          <br />
          <label>
            Value:&nbsp;
            <input
              type="text"
              value={newAbsenceValue}
              onChange={e => setNewAbsenceValue(e.target.value)}
              placeholder="Enter absence value"
            />
          </label>
          <br />
          <button onClick={handleAddAbsenceCode}>Add Absence Code</button>
          <br /><br />
          <p>Note: Absence codes starting with 'T' are<br></br>treated as time-based absences.</p>
        </>
      )}
      <br /><br />
      <button onClick={handleSaveJsonFiles}>Save</button>{' '}
      <button onClick={onClose}>Cancel</button>
    </div>
  )
}

function ManageJsonFilesWindow({ absenceData, setAbsenceData, absenceCodes, setAbsenceCodes, onClose }) {
  console.log('ManageJsonFilesWindow opened with absenceData:', absenceData);
}

// --- Main App ---
function App() {
  const absenceFilePath = path.join(process.cwd(), 'assets', 'AbsenceTracker.json')
  // Use state for absenceCodes so UI updates and changes are tracked
  const [absenceData, setAbsenceData] = useState(
    JSON.parse(
      fs.readFileSync(
        absenceFilePath,
        'utf-8'
      )
    ).sort((a, b) => {
      const nameA = a.name.toUpperCase()
      const nameB = b.name.toUpperCase()
      if (nameA < nameB) return -1
      if (nameA > nameB) return 1
      return 0
    })
  )
  const [absenceCodes, setAbsenceCodes] = useState(
    JSON.parse(
      fs.readFileSync(
        path.join(
          process.cwd(),
          'assets',
          'AbsenceCodes.json'
        ),
        'utf-8'
      )
    ).sort((a, b) => {
      const nameA = a.code.toUpperCase()
      const nameB = b.code.toUpperCase()
      if (nameA < nameB) return -1
      if (nameA > nameB) return 1
      return 0
    })
  )
  // State for current year and month selection
  const currentYear = dayjs().format('YYYY')
  const [year, setYear] = useState(currentYear)
  const currentMonthName = dayjs().format('MMMM')
  const [month, setMonth] = useState(currentMonthName)
  // State for popup info and editing absences
  const [popupInfo, setPopupInfo] = useState(null)
  const [editAbsences, setEditAbsences] = useState([])
  const [showExportPopup, setShowExportPopup] = useState(false)
  const [manageJsonFiles, setManageJsonFiles] = useState(false)

  const months = Array.from({ length: 12 }, (_, i) => dayjs().month(i).format('MMMM'))
  const daysInMonth = GetDaysArray(months.indexOf(month), year)

  // Create screen reference for PDF export
  const screenRef = useRef()

  // Handler for changing the month dropdown
  const handleMonthChange = (e) => setMonth(e.target.value)

  // Handler for clicking a cell in the table
  function handleCellClick(employee, day, /*absenceCodes, absenceComments*/) {
    const monthIndex = months.indexOf(month)
    const dateStr = GetDateString(year, monthIndex, day)
    const empObj = absenceData.find(emp => emp.name === employee)
    const absencesForDay = empObj?.absences?.filter(a => a.date === dateStr) || []
    setEditAbsences(absencesForDay.length ? absencesForDay : [{ code: '', comment: '', date: dateStr }])
    setPopupInfo({ employee, day, dateStr })
  }

  // Handler for editing absence fields
  function handleAbsenceChange(idx, field, value) {
    setEditAbsences(prev =>
      prev.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    )
  }

  // Handler for adding a new absence row
  function handleAddAbsence() {
    setEditAbsences(prev => [...prev, { code: '', minutes: '', comment: '', date: popupInfo.dateStr }])
  }

  // Handler for deleting an absence row
  function handleDeleteAbsence(idx) {
    setEditAbsences(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSaveAbsences() {
    const empIdx = absenceData.findIndex(emp => emp.name === popupInfo.employee)
    if (empIdx === -1) return

    const updatedAbsences = [
      ...absenceData[empIdx].absences.filter(a => a.date !== popupInfo.dateStr),
      ...editAbsences.filter(a => a.code)
    ]

    const updatedTracker = [...absenceData]
    updatedTracker[empIdx] = {
      ...updatedTracker[empIdx],
      absences: updatedAbsences
    }

    setAbsenceData(updatedTracker)
    setPopupInfo(null)
  }


  // Handler for closing the popup
  function handleCancel() {
    setPopupInfo(null)
  }

  // Button handler to save current absenceData to JSON file
  function handleUpdateJson() {
    try {
      fs.writeFileSync(absenceFilePath, JSON.stringify(absenceData, null, 2), 'utf-8')
      alert('Absence data saved to AbsenceTracker.json!')
    } catch (err) {
      alert('Failed to save absences: ' + err.message)
    }
  }

  // --- JSX UI ---
  return (
    <>
      <h1>Absence Tracker</h1>
      {/* Button to update JSON file */}
      <button
        style={{ marginBottom: '1rem', background: '#4caf50', color: '#fff' }}
        onClick={handleUpdateJson}
      >
        Save Absence Table to JSON
      </button>
      {' '}
      {/* Button to open export popup */}
      <button
        style={{ marginBottom: '1rem', background: '#2196f3', color: '#fff' }}
        onClick={() => setShowExportPopup(true)}
      >
        Export Data
      </button>
      {' '}
      {/* Button to manage the JSON files */}
      <button
        style={{ marginBottom: '1rem', background: '#ff9800', color: '#fff' }}
        onClick={() => setManageJsonFiles(true)}
      >
        Manage Employees
      </button>
      {/* Month and year selection */}
      <div>
        <select value={month} onChange={handleMonthChange}>
          {/*<option value="">Select month</option>*/}
          {months.map((m, idx) => (
            <option key={idx} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Enter year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </div>
      {/* Main tables side by side */}
      <div ref={screenRef}>
        <div className="card" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <AbsenceTable
            absenceData={absenceData}
            daysInMonth={daysInMonth}
            month={month}
            year={year}
            onCellClick={handleCellClick}
          />
          <AbsenceSummaryTable
            absenceData={absenceData}
            absenceCodes={absenceCodes}
            month={month}
            year={year}
          />
        </div>
        {/* Daily Absence Tally Table below main table */}
        <div className="card" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <DailyAbsenceTallyTable
            absenceData={absenceData}
            absenceCodes={absenceCodes}
            daysInMonth={daysInMonth}
            month={month}
            year={year}
          />
        </div>
      </div>
      {/* Popup for editing absences */}
      {popupInfo && (
        <AbsencePopup
          popupInfo={popupInfo}
          editAbsences={editAbsences}
          absenceCodes={absenceCodes}
          handleAbsenceChange={handleAbsenceChange}
          handleAddAbsence={handleAddAbsence}
          handleDeleteAbsence={handleDeleteAbsence}
          handleSaveAbsences={handleSaveAbsences}
          handleCancel={handleCancel}
        />
      )}
      {/* Export Data Popup */}
      {showExportPopup && (
        <ExportDataPopup
          absenceData={absenceData}
          onClose={() => setShowExportPopup(false)}
        />
      )}
      {/* Manage JSON Files Popup */}
      {manageJsonFiles && (
        <ManageJsonFilesWindow
          absenceData={absenceData}
          setAbsenceData={setAbsenceData}
          onClose={() => setManageJsonFiles(false)}
        />
      )}
    </>
  )
}

export default App
