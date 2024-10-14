// js/graphFunctions.js

// Register the Zoom plugin
if (typeof ChartZoom !== "undefined") {
  Chart.register(ChartZoom);
}

// Global Variables
let gyroChartX, gyroChartY, gyroChartZ; // Gyro charts
let motorCharts = {}; // Object to hold motor charts by value type
let motorChartData = {}; // Object to hold data for motor charts
let motorChartMinMax = {}; // Object to track min and max for each value type
let gyroChartData = {}; // For gyro data
let lastTimestamp = null;
let userInteracted = false;
let selectedTimeWindow = 20;

// Function to reset and initialize gyro charts
function resetGyroCharts() {
  // Destroy existing charts if they exist
  if (gyroChartX) gyroChartX.destroy();
  if (gyroChartY) gyroChartY.destroy();
  if (gyroChartZ) gyroChartZ.destroy();

  // Initialize charts for X, Y, Z axes
  gyroChartX = createGyroChart("gyroChartX", "X");
  gyroChartY = createGyroChart("gyroChartY", "Y");
  gyroChartZ = createGyroChart("gyroChartZ", "Z");

  // Reset gyro data storage
  gyroChartData = {
    X: {},
    Y: {},
    Z: {},
  };
}

// Function to create a gyro chart for a specific axis
function createGyroChart(canvasId, axisLabel) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  return new Chart(ctx, {
    type: "line",
    data: {
      datasets: [],
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: "x",
            modifierKey: "alt", // Enable panning with Control key
            threshold: 10,
          },
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1,
            },
            pinch: {
              enabled: true, // Enable zooming with pinch gestures
            },
            mode: "x", // Zoom along the x-axis
          },
        },
        title: {
          display: true,
          text: `GYRO Data - ${axisLabel} Axis`,
        },
        legend: {
          display: true,
          onClick: function (e, legendItem, legend) {
            // Custom legend click handler
            const index = legendItem.datasetIndex;
            const ci = legend.chart;
            const meta = ci.getDatasetMeta(index);

            // Toggle the visibility
            meta.hidden =
              meta.hidden === null ? !ci.data.datasets[index].hidden : null;

            ci.update();
          },
        },
        tooltip: {
          enabled: true,
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "second",
            tooltipFormat: "MMM dd HH:mm:ss",
            displayFormats: {
              millisecond: "HH:mm:ss.SSS",
              second: "HH:mm:ss",
              minute: "HH:mm",
              hour: "HH:mm",
            },
          },
          title: {
            display: true,
            text: "Time",
          },
        },
        yAngularVelocity: {
          type: "linear",
          display: true,
          position: "left",
          title: {
            display: true,
            text: "Angular Velocity (deg/s)",
          },
          min: -500,
          max: 500,
        },
        yAcceleration: {
          type: "linear",
          display: true,
          position: "right",
          title: {
            display: true,
            text: "Acceleration (g)",
          },
          min: -4,
          max: 4,
          grid: {
            drawOnChartArea: false, // Prevents grid lines from overlapping
          },
        },
      },
      elements: {
        line: {
          tension: 0, // Straight lines
        },
      },
    },
  });
}

// Function to reset and initialize motor charts
function resetMotorCharts() {
  // Destroy existing motor charts
  for (const valueType in motorCharts) {
    if (motorCharts.hasOwnProperty(valueType)) {
      motorCharts[valueType].chart.destroy();
    }
  }

  // Clear motor charts and data
  motorCharts = {};
  motorChartData = {};

  // Clear motor charts container in HTML
  const motorChartsContainer = document.getElementById("motorChartsContainer");
  motorChartsContainer.innerHTML = "";
}

// Function to create a motor chart for a specific value type
function createMotorChart(valueType) {
  // Create canvas element
  const canvasId = `motorChart_${valueType}`;
  const canvas = document.createElement("canvas");
  canvas.id = canvasId;
  canvas.width = 400;
  canvas.height = 200;

  // Create card elements
  const card = document.createElement("div");
  card.className = "card mt-4";

  const cardHeader = document.createElement("div");
  cardHeader.className = "card-header";
  cardHeader.textContent = `Motor Data - ${valueType}`;

  const cardBody = document.createElement("div");
  cardBody.className = "card-body";
  cardBody.appendChild(canvas);

  card.appendChild(cardHeader);
  card.appendChild(cardBody);

  // Append to motor charts container
  const motorChartsContainer = document.getElementById("motorChartsContainer");
  motorChartsContainer.appendChild(card);

  // Initialize chart
  const ctx = canvas.getContext("2d");
  const chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [],
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: "x",
            modifierKey: "alt", // Enable panning with Control key
            threshold: 10,
          },
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1,
            },
            pinch: {
              enabled: true, // Enable zooming with pinch gestures
            },
            mode: "x", // Zoom along the x-axis
          },
        },
        title: {
          display: true,
          text: `Motor Data - ${valueType}`,
        },
        legend: {
          display: true,
        },
        tooltip: {
          enabled: true,
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "second",
            tooltipFormat: "MMM dd HH:mm:ss",
            displayFormats: {
              millisecond: "HH:mm:ss.SSS",
              second: "HH:mm:ss",
              minute: "HH:mm",
              hour: "HH:mm",
            },
          },
          title: {
            display: true,
            text: "Time",
          },
        },
        y: {
          title: {
            display: true,
            text: "Value",
          },
          min: 0, // Initial placeholder, will be updated
          max: 1, // Initial placeholder, will be updated
        },
      },
      elements: {
        line: {
          tension: 0, // Straight lines
        },
      },
    },
  });

  // Store chart in motorCharts object
  motorCharts[valueType] = {
    chart: chart,
    datasets: {},
  };
}

// Function to get or create a motor chart for a value type
function getMotorChart(valueType) {
  if (!motorCharts[valueType]) {
    createMotorChart(valueType);
  }
  return motorCharts[valueType].chart;
}

// Update Chart Data
function updateChartData(dataArray) {
  if (!dataArray || dataArray.length === 0) return;

  let globalMin = Infinity;
  let globalMax = -Infinity;
  let adjustedLastTimestamp = null; // Keep track of the last adjusted timestamp

  dataArray.forEach((dataPoint) => {
    const timestamp = Number(dataPoint.timestamp);

    // Convert timestamp to milliseconds if it's in seconds
    let adjustedTimestamp = timestamp;
    if (timestamp < 10000000000) {
      adjustedTimestamp *= 1000;
    }

    adjustedLastTimestamp = adjustedTimestamp; // Update last adjusted timestamp

    const sensors = dataPoint.sensors;

    // Iterate over each sensor in the data point
    for (const sensorName in sensors) {
      if (sensors.hasOwnProperty(sensorName)) {
        const sensorData = sensors[sensorName];

        if (sensorName === "GYRO") {
          // Handle GYRO data separately
          handleGyroData(sensorData, adjustedTimestamp);
        } else if (sensorName.startsWith("MOTOR")) {
          // Handle motor data
          handleMotorData(sensorName, sensorData, adjustedTimestamp);
        }
      }
    }
  });

  // Use the last adjusted timestamp
  lastTimestamp = adjustedLastTimestamp || Date.now();

  // Update Y-axis scale based on global min and max
  updateYAxisScale(globalMin, globalMax);

  // Update X-axis range based on the selected time window
  if (!userInteracted) {
    updateXAxisRange();
  }

  dataChart.update();
}

// Function to handle GYRO data
function handleGyroData(gyroData, adjustedTimestamp) {
  const axes = ["X", "Y", "Z"];

  axes.forEach((axis) => {
    // Angular Velocity
    const angVelValue = gyroData.angular_velocity[axis.toLowerCase()];
    const angVelDatasetName = `Gyro Angular Velocity ${axis}`;

    // Initialize dataset if it doesn't exist
    if (!gyroChartData[axis][angVelDatasetName]) {
      gyroChartData[axis][angVelDatasetName] = [];
      getGyroChartByAxis(axis).data.datasets.push({
        label: angVelDatasetName,
        data: gyroChartData[axis][angVelDatasetName],
        borderColor: getRandomColor(),
        backgroundColor: "transparent",
        fill: false,
        spanGaps: false,
        yAxisID: "yAngularVelocity",
      });
    }

    // Add data point
    gyroChartData[axis][angVelDatasetName].push({
      x: adjustedTimestamp,
      y: angVelValue,
    });

    // Acceleration
    const accelValue = gyroData.acceleration[axis.toLowerCase()];
    const accelDatasetName = `Gyro Acceleration ${axis}`;

    if (!gyroChartData[axis][accelDatasetName]) {
      gyroChartData[axis][accelDatasetName] = [];
      getGyroChartByAxis(axis).data.datasets.push({
        label: accelDatasetName,
        data: gyroChartData[axis][accelDatasetName],
        borderColor: getRandomColor(),
        backgroundColor: "transparent",
        fill: false,
        spanGaps: false,
        yAxisID: "yAcceleration",
      });
    }

    gyroChartData[axis][accelDatasetName].push({
      x: adjustedTimestamp,
      y: accelValue,
    });

    // Resultant Acceleration
    const resultantAccelValue = gyroData.resultant_acceleration;
    const resultantAccelDatasetName = `Resultant Acceleration`;

    if (!gyroChartData[axis][resultantAccelDatasetName]) {
      // Only add resultant_acceleration dataset once per axis chart
      gyroChartData[axis][resultantAccelDatasetName] = [];
      getGyroChartByAxis(axis).data.datasets.push({
        label: resultantAccelDatasetName,
        data: gyroChartData[axis][resultantAccelDatasetName],
        borderColor: getRandomColor(),
        backgroundColor: "transparent",
        fill: false,
        spanGaps: false,
        hidden: true,
        yAxisID: "yAcceleration",
      });
    }

    gyroChartData[axis][resultantAccelDatasetName].push({
      x: adjustedTimestamp,
      y: resultantAccelValue,
    });

    // Limit data points to improve performance
    const maxDataPoints = 1000;
    if (gyroChartData[axis][angVelDatasetName].length > maxDataPoints) {
      gyroChartData[axis][angVelDatasetName].shift();
    }
    if (gyroChartData[axis][accelDatasetName].length > maxDataPoints) {
      gyroChartData[axis][accelDatasetName].shift();
    }
    if (gyroChartData[axis][resultantAccelDatasetName].length > maxDataPoints) {
      gyroChartData[axis][resultantAccelDatasetName].shift();
    }
  });

  // Update gyro charts
  gyroChartX.update();
  gyroChartY.update();
  gyroChartZ.update();
}

// Function to handle motor data
function handleMotorData(sensorName, sensorData, adjustedTimestamp) {
  // Extract motor name and value type
  const motorMatch = sensorName.match(/(MOTOR\d+)_(\w+)/);
  if (motorMatch) {
    const motorName = motorMatch[1]; // e.g., 'MOTOR1'
    const valueType = motorMatch[2]; // e.g., 'I'

    // Initialize motor chart data structure if not exists
    if (!motorChartData[valueType]) {
      motorChartData[valueType] = {};
    }

    // Initialize min/max tracking for valueType if not exists
    if (!motorChartMinMax[valueType]) {
      motorChartMinMax[valueType] = { min: Infinity, max: -Infinity };
    }

    // Initialize dataset for the motor in the valueType chart
    if (!motorChartData[valueType][motorName]) {
      motorChartData[valueType][motorName] = [];
      const motorChart = getMotorChart(valueType);
      motorChart.data.datasets.push({
        label: motorName,
        data: motorChartData[valueType][motorName],
        fill: false,
        borderColor: getRandomColor(),
        backgroundColor: "transparent",
        spanGaps: false,
      });
    }

    // Add data point
    const value = sensorData.value;
    motorChartData[valueType][motorName].push({
      x: adjustedTimestamp,
      y: value,
    });

    // Update min/max for this valueType
    const min = sensorData.min !== undefined ? sensorData.min : value;
    const max = sensorData.max !== undefined ? sensorData.max : value;

    motorChartMinMax[valueType].min = Math.min(
      motorChartMinMax[valueType].min,
      min
    );
    motorChartMinMax[valueType].max = Math.max(
      motorChartMinMax[valueType].max,
      max
    );

    // Limit data points
    const maxDataPoints = 1000;
    if (motorChartData[valueType][motorName].length > maxDataPoints) {
      motorChartData[valueType][motorName].shift();
    }

    // Update Y-axis scale for this motor chart
    updateMotorChartYAxisScale(valueType);

    // Update motor chart
    motorCharts[valueType].chart.update();
  }
}

// Function to get the gyro chart object based on axis
function getGyroChartByAxis(axis) {
  switch (axis) {
    case "X":
      return gyroChartX;
    case "Y":
      return gyroChartY;
    case "Z":
      return gyroChartZ;
    default:
      return null;
  }
}

// Optional: Function to get Y-axis ID based on sensor name
function getYAxisID(sensorName) {
  if (sensorName.includes("V")) {
    return "y"; // Voltage sensors on default Y-axis
  } else if (sensorName.includes("I")) {
    return "y1"; // Current sensors on secondary Y-axis
  } else {
    return "y"; // Default to primary Y-axis
  }
}

function updateYAxisScale(minValue, maxValue) {
  if (
    dataChart &&
    dataChart.options &&
    dataChart.options.scales &&
    dataChart.options.scales.y
  ) {
    dataChart.options.scales.y.min = minValue;
    dataChart.options.scales.y.max = maxValue;
  }
}

function updateXAxisRange() {
  const charts = [];
  // Collect all charts
  charts.push(gyroChartX, gyroChartY, gyroChartZ);
  for (const valueType in motorCharts) {
    if (motorCharts.hasOwnProperty(valueType)) {
      charts.push(motorCharts[valueType].chart);
    }
  }

  let minTimestamp = Infinity;
  let maxTimestamp = -Infinity;

  // Gather timestamps from data
  // Gyro data
  for (const axis in gyroChartData) {
    for (const datasetName in gyroChartData[axis]) {
      const data = gyroChartData[axis][datasetName];
      if (data.length > 0) {
        const timestamps = data.map((dp) => dp.x);
        minTimestamp = Math.min(minTimestamp, ...timestamps);
        maxTimestamp = Math.max(maxTimestamp, ...timestamps);
      }
    }
  }

  // Motor data
  for (const valueType in motorChartData) {
    for (const motorName in motorChartData[valueType]) {
      const data = motorChartData[valueType][motorName];
      if (data.length > 0) {
        const timestamps = data.map((dp) => dp.x);
        minTimestamp = Math.min(minTimestamp, ...timestamps);
        maxTimestamp = Math.max(maxTimestamp, ...timestamps);
      }
    }
  }

  // Use lastTimestamp if no data is present
  if (minTimestamp === Infinity || maxTimestamp === -Infinity) {
    minTimestamp = lastTimestamp || Date.now();
    maxTimestamp = lastTimestamp || Date.now();
  }

  charts.forEach((chart) => {
    if (
      chart &&
      chart.options &&
      chart.options.scales &&
      chart.options.scales.x
    ) {
      if (selectedTimeWindow === "all") {
        // Show all data
        chart.options.scales.x.min = minTimestamp;
        chart.options.scales.x.max = maxTimestamp;
      } else {
        const now = lastTimestamp || Date.now();
        const minTime = now - selectedTimeWindow * 1000;
        chart.options.scales.x.min = minTime;
        chart.options.scales.x.max = now;
      }
      chart.update("none");
    }
  });
}

function resetZoomPan() {
  const charts = [];
  // Collect all charts
  charts.push(gyroChartX, gyroChartY, gyroChartZ);
  for (const valueType in motorCharts) {
    if (motorCharts.hasOwnProperty(valueType)) {
      charts.push(motorCharts[valueType].chart);
    }
  }

  charts.forEach((chart) => {
    if (chart.resetZoom) {
      chart.resetZoom();
    }
  });

  userInteracted = false;
  updateXAxisRange();
}

function updateGyroChartsXAxisRange() {
  const charts = [gyroChartX, gyroChartY, gyroChartZ];
  charts.forEach((chart) => {
    if (
      chart &&
      chart.options &&
      chart.options.scales &&
      chart.options.scales.x
    ) {
      const now = lastTimestamp || Date.now();
      const minTime = now - selectedTimeWindow * 1000;

      chart.options.scales.x.min = minTime;
      chart.options.scales.x.max = now;

      chart.update("none"); // Update chart without animation
    }
  });
}

function updateMotorChartsXAxisRange() {
  const now = lastTimestamp || Date.now();
  const minTime = now - selectedTimeWindow * 1000;

  for (const valueType in motorCharts) {
    if (motorCharts.hasOwnProperty(valueType)) {
      const chart = motorCharts[valueType].chart;
      if (
        chart &&
        chart.options &&
        chart.options.scales &&
        chart.options.scales.x
      ) {
        chart.options.scales.x.min = minTime;
        chart.options.scales.x.max = now;

        chart.update("none"); // Update chart without animation
      }
    }
  }
}

// Function to update Y-axis scale for a motor chart
function updateMotorChartYAxisScale(valueType) {
  const chart = motorCharts[valueType].chart;
  if (
    chart &&
    chart.options &&
    chart.options.scales &&
    chart.options.scales.y
  ) {
    const min = motorChartMinMax[valueType].min;
    const max = motorChartMinMax[valueType].max;
    chart.options.scales.y.min = min;
    chart.options.scales.y.max = max;
  }
}

// Helper Function to Generate Random Colors
function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
