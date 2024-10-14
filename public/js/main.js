// Global Variables
let serverIp;
let serverPort;
let baseUrl;

let isRecording = false;
let selectedFileName = null;

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  // Initialize serverIp and serverPort after DOM is loaded
  serverIp = document.getElementById("serverIp").value;
  serverPort = document.getElementById("serverPort").value;
  baseUrl = `http://${serverIp}:${serverPort}`;

  selectedFileName = null;

  // Get initial time window value from the dropdown
  selectedTimeWindow = Number(
    document.getElementById("timeWindowSelect").value
  );

  resetGyroCharts();
  resetMotorCharts();
  fetchDataFileList(); // Populate the data file list

  // Fetch data and update status
  updateStatus();
  fetchData();

  // Start polling intervals
  setInterval(fetchData, 500); // Fetch data every X seconds
  setInterval(updateStatus, 2000); // Update status every X seconds
});
