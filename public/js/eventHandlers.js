// js/eventHandlers.js

// Update baseUrl when IP or Port changes
document.getElementById("serverIp").addEventListener("input", (e) => {
  serverIp = e.target.value;
  baseUrl = `http://${serverIp}:${serverPort}`;
});

document.getElementById("serverPort").addEventListener("input", (e) => {
  serverPort = e.target.value;
  baseUrl = `http://${serverIp}:${serverPort}`;
});

// Start Recording
document.getElementById("startBtn").addEventListener("click", () => {
  startRecording();
});

// Stop Recording
document.getElementById("stopBtn").addEventListener("click", () => {
  stopRecording();
});

// Set Session Name
document.getElementById("setSessionNameBtn").addEventListener("click", () => {
  const newSessionName = document.getElementById("sessionName").value;
  setSessionName(newSessionName);
});

// Load Data from Selected File
document.getElementById("loadDataBtn").addEventListener("click", () => {
  const fileName = document.getElementById("dataFileSelect").value;
  loadDataFromFile(fileName);
});

// Clear Selected Data and Chart
document.getElementById("clearDataBtn").addEventListener("click", () => {
  clearSelectedData();
});

// Time Window Selection
document.getElementById("timeWindowSelect").addEventListener("change", (e) => {
  const selectedValue = event.target.value;
  if (selectedValue === "all") {
    selectedTimeWindow = "all";
  } else {
    selectedTimeWindow = parseInt(selectedValue, 10);
  }
  userInteracted = false; // Reset user interaction flag
  updateXAxisRange(); // Update X-axis range for all charts
});

document.getElementById("resetZoomBtn").addEventListener("click", () => {
  resetZoomPan();
});
