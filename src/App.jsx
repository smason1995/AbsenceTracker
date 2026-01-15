import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import "./App.css";

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function getDaysArray(month, year) {
  const numDays = daysInMonth(month, year);
  const daysArr = [];
  for (let day = 1; day <= numDays; day++) {
    daysArr.push(day);
  }
  return daysArr;
}

function EmployeeDataTable({
  employeeData, setEmployeeData,
  codeData,
  month, setMonth,
  year, setYear,
  daysArr, setDaysArr
}) {
  const [tableData, setTableData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    setMonth(selectedMonth);
    setYear(selectedYear);
    setTableData(employeeData);
    setDaysArr(getDaysArray(selectedMonth, selectedYear));
  }, [selectedMonth, selectedYear, employeeData]);

  function handleCellClick(employeeIndex, day) {
    console.log(`Cell clicked: Employee Index ${employeeIndex}, Day ${day}`);
    // Additional logic for handling cell click can be added here
    const label = 'unique-popup-label'; // A unique label for the new window
    const webview = new WebviewWindow(label, {
      url: 'public/employeeDayRecord.html', // The URL or path to the content of the popup
      title: 'My Popup Window',
      width: 500,
      height: 400,
      // Add other window options like decorations, alwaysOnTop, etc.
      decorations: true,
      alwaysOnTop: true,
    });

    // Since window creation is asynchronous, you can listen for events
    webview.once('tauri://created', function () {
      console.log('Webview window successfully created');
    });

    webview.once('tauri://error', function (e) {
      console.error('An error occurred during webview window creation:', e);
    });
  }

  function generateEmployeeTable() {

    return (
      <table className="dataTable">
        <thead>
          <tr>
            <th>Employee Name</th>
            {daysArr.map(day => (
              <th key={day} style={{ minWidth: '48px', whitespace: 'nowrap' }}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.filter(employee => employee.active).map((employee, empIndex) => (
            <tr key={empIndex}>
              {/* Employee Name Cell */}
              <td align="left">
                {employee.employeeId} - {employee.name}
              </td>
              {/* Daily Absence Cells */}
              {daysArr.map(day => {
                const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayAbsences = employee.absences?.filter(abs => abs.date === dateStr) || [];
                const codeStr = dayAbsences.map(abs => abs.code && abs.code.startsWith('T') && abs?.minutes
                  ? `${abs.code}${abs.minutes}`
                  : abs.code
                ).join('|');
                const commentStr = dayAbsences.map(abs => abs.comment).filter(Boolean).join('; ');
                return (
                  <td
                    key={day}
                    title={commentStr}
                    style={{ minWidth: '48px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                    onClick={() => handleCellClick(empIndex, day)}
                  >
                    {codeStr}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="employeeDataTable">
      <div>
        <table align="center">
          <thead>
            <tr>
              <th>Month</th>
              <th>Year</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                >
                  {months.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  name="selectedYear"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {generateEmployeeTable()}
    </div>
  )
}

function EmployeeSummaryTable({ employeeData }) {
  return (
    <h2>TODO: Employee Summary Table</h2>
  )
}

function AbsenceSummaryTable({ employeeData }) {
  return (
    <h2>TODO: Absence Summary Table</h2>
  )
}

function App() {
  const [employeeData, setEmployeeData] = useState([]);
  const [codeData, setCodeData] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [daysArr, setDaysArr] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function fetchEmployeeData() {
      try {
        const employeeJson = JSON.parse(
          await invoke("read_employee_json")
        ).sort(
          (a, b) => a.name.localeCompare(b.name)
        );
        setEmployeeData(employeeJson);
      } catch (error) {
        console.error("Failed to fetch employee data:", error);
      }
    }

    async function fetchCodeData() {
      try {
        const codeJson = JSON.parse(
          await invoke("read_code_json")
        ).sort(
          (a, b) => a.code.localeCompare(b.code)
        );
        setCodeData(codeJson);
      } catch (error) {
        console.error("Failed to fetch code data:", error);
      }
    }

    fetchEmployeeData();
    fetchCodeData();
    setDaysArr(getDaysArray(month, year));
    setDataLoaded(true);
  }, []);

  return (
    <main className="container">
      <h1>Absence Tracker</h1>
      <div className="buttonContainer">
        <button>Save Data</button>
        <button>Export Data</button>
        <button>Settings</button>
      </div>
      <div className="formContainer">
        <EmployeeDataTable
          employeeData={employeeData} setEmployeeData={setEmployeeData}
          codeData={codeData}
          month={month} setMonth={setMonth}
          year={year} setYear={setYear}
          daysArr={daysArr} setDaysArr={setDaysArr}
        />
        <div className="employeeSummaryTable">
          <EmployeeSummaryTable employeeData={employeeData} />
        </div>
      </div>
      <div className="absenceSummaryTable">
        <AbsenceSummaryTable employeeData={employeeData} />
      </div>
    </main>
  );
}

export default App;
