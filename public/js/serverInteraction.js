// js/serverInteraction.js

// Start Recording
function startRecording() {
  fetch(`${baseUrl}/start`, { method: "POST" })
    .then((res) => res.json())
    .then((data) => {
      selectedFileName = null; // Clear selected file when recording starts
      resetGyroCharts();
      resetMotorCharts();
      updateStatus();
    })
    .catch((err) => console.error(err));
}

// Stop Recording
function stopRecording() {
  fetch(`${baseUrl}/stop`, { method: "POST" })
    .then((res) => res.json())
    .then((data) => updateStatus())
    .catch((err) => console.error(err));
}

// Set Session Name
function setSessionName(newSessionName) {
  fetch(`${baseUrl}/set-session-name`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ newSessionName }),
  })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message);
      updateStatus();
    })
    .catch((err) => console.error(err));
}

// Load Data from Selected File
function loadDataFromFile(fileName) {
  if (!fileName) {
    alert("Please select a data file to load.");
    return;
  }

  fetch(`${baseUrl}/select-file`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileName }),
  })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message);
      // Reset chart data
      resetGyroCharts();
      resetMotorCharts();
      // Update selectedFileName immediately
      selectedFileName = fileName;
      lastTimestamp = null; // Reset lastTimestamp when loading a new file
      // Start fetching data from the selected file
      fetchData(); // Fetch data immediately
    })
    .catch((err) => console.error(err));
}

// Clear Selected Data and Chart
function clearSelectedData() {
  fetch(`${baseUrl}/clear-selected-file`, { method: "POST" })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message);
      // Clear the chart and selectedFileName
      resetGyroCharts();
      resetMotorCharts();
      selectedFileName = null;
    })
    .catch((err) => console.error(err));
}

// Fetch Data File List
function fetchDataFileList() {
  fetch(`${baseUrl}/list-files`)
    .then((res) => res.json())
    .then((data) => {
      const fileSelect = document.getElementById("dataFileSelect");
      // Clear existing options
      fileSelect.innerHTML =
        '<option value="">-- Select a data file --</option>';
      data.files.forEach((file) => {
        const option = document.createElement("option");
        option.value = file;
        option.textContent = file;
        fileSelect.appendChild(option);
      });
    })
    .catch((err) => console.error(err));
}

// Fetch Data
function fetchData() {
  if (!isRecording && !selectedFileName) {
    return; // Do not fetch data if not recording and no file selected
  }
  const url = lastTimestamp
    ? `${baseUrl}/data?since=${lastTimestamp}`
    : `${baseUrl}/data`;

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const dataArray = data.data;
      if (Array.isArray(dataArray) && dataArray.length > 0) {
        updateChartData(dataArray);
      }
    })
    .catch((err) => console.error(err));
}

// Update Server Status
function updateStatus() {
  fetch(`${baseUrl}/status`)
    .then((res) => res.json())
    .then((data) => {
      isRecording = data.isRecording;
      selectedFileName = data.selectedFileName || selectedFileName;
      document.getElementById("status").innerText = data.message;
      document.getElementById("currentFile").innerText =
        data.currentFileName ||
        selectedFileName ||
        "No file is currently being used.";
    })
    .catch((err) => {
      document.getElementById("status").innerText = "Error fetching status.";
      console.error(err);
    });
}
