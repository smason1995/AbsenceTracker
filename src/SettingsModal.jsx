import { useState, useEffect } from 'react';
import './SettingsModal.css';

export function SettingsModal({ isOpen, onClose, employeeData, codeData, onSaveData }) {
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [codes, setCodes] = useState([]);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editingCodeId, setEditingCodeId] = useState(null);
  const [newEmployee, setNewEmployee] = useState({ name: '', employeeId: '', active: true });
  const [newCode, setNewCode] = useState({ code: '', value: '' });

  useEffect(() => {
    if (employeeData) {
      setEmployees(JSON.parse(JSON.stringify(employeeData)));
    }
    if (codeData) {
      setCodes(JSON.parse(JSON.stringify(codeData)));
    }
  }, [employeeData, codeData, isOpen]);

  const handleSave = () => {
    onSaveData({
      employeeData: employees,
      codeData: codes
    });
  };

  const handleAddEmployee = () => {
    if (newEmployee.name && newEmployee.employeeId) {
      setEmployees([...employees, { ...newEmployee }]);
      setNewEmployee({ name: '', employeeId: '', active: true });
    }
  };

  const handleDeleteEmployee = (index) => {
    setEmployees(employees.filter((_, i) => i !== index));
  };

  const handleUpdateEmployee = (index, field, value) => {
    const updated = [...employees];
    if (field === 'active') {
      updated[index][field] = !updated[index][field];
    } else {
      updated[index][field] = value;
    }
    setEmployees(updated);
  };

  const handleAddCode = () => {
    if (newCode.code && newCode.value) {
      setCodes([...codes, { ...newCode }]);
      setNewCode({ code: '', value: '' });
    }
  };

  const handleDeleteCode = (index) => {
    setCodes(codes.filter((_, i) => i !== index));
  };

  const handleUpdateCode = (index, field, value) => {
    const updated = [...codes];
    updated[index][field] = value;
    setCodes(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="settingsModalOverlay" onClick={onClose}>
      <div className="settingsModalContent" onClick={(e) => e.stopPropagation()}>
        <div className="settingsModalHeader">
          <h2>Settings</h2>
          <button className="settingsCloseBtn" onClick={onClose}>×</button>
        </div>

        <div className="settingsTabs">
          <button
            className={`settingsTabBtn ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            Employees
          </button>
          <button
            className={`settingsTabBtn ${activeTab === 'codes' ? 'active' : ''}`}
            onClick={() => setActiveTab('codes')}
          >
            Absence Codes
          </button>
        </div>

        <div className="settingsTabContent">
          {activeTab === 'employees' && (
            <div className="employeesTab">
              <h3>Manage Employees</h3>
              <div className="addForm">
                <input
                  type="text"
                  placeholder="Employee ID"
                  value={newEmployee.employeeId}
                  onChange={(e) => setNewEmployee({ ...newEmployee, employeeId: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Employee Name"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                />
                <button onClick={handleAddEmployee}>Add Employee</button>
              </div>
              <div className="dataList">
                {employees.map((employee, index) => (
                  <div key={index} className="dataItem">
                    <div className="dataItemContent">
                      <div className="dataItemField">
                        <label>ID:</label>
                        <input
                          type="text"
                          value={employee.employeeId}
                          onChange={(e) => handleUpdateEmployee(index, 'employeeId', e.target.value)}
                        />
                      </div>
                      <div className="dataItemField">
                        <label>Name:</label>
                        <input
                          type="text"
                          value={employee.name}
                          onChange={(e) => handleUpdateEmployee(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="dataItemField">
                        <label>Active:</label>
                        <input
                          type="checkbox"
                          checked={employee.active}
                          onChange={() => handleUpdateEmployee(index, 'active', !employee.active)}
                        />
                      </div>
                    </div>
                    <button
                      className="deleteBtn"
                      onClick={() => handleDeleteEmployee(index)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'codes' && (
            <div className="codesTab">
              <h3>Manage Absence Codes</h3>
              <div className="addForm">
                <input
                  type="text"
                  placeholder="Code"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Value/Description"
                  value={newCode.value}
                  onChange={(e) => setNewCode({ ...newCode, value: e.target.value })}
                />
                <button onClick={handleAddCode}>Add Code</button>
              </div>
              <div className="dataList">
                {codes.map((code, index) => (
                  <div key={index} className="dataItem">
                    <div className="dataItemContent">
                      <div className="dataItemField">
                        <label>Code:</label>
                        <input
                          type="text"
                          value={code.code}
                          onChange={(e) => handleUpdateCode(index, 'code', e.target.value)}
                        />
                      </div>
                      <div className="dataItemField">
                        <label>Description:</label>
                        <input
                          type="text"
                          value={code.value}
                          onChange={(e) => handleUpdateCode(index, 'value', e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      className="deleteBtn"
                      onClick={() => handleDeleteCode(index)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="settingsModalFooter">
          <button className="cancelBtn" onClick={onClose}>Cancel</button>
          <button className="saveBtn" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
