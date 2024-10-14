// server.js
const express = require("express");
const expressWs = require("express-ws");
const helmet = require("helmet");
const fs = require("fs");
const path = require("path");
const http = require("http");

const app = express();
expressWs(app);
const port = 5000;

// Middleware to parse JSON data from incoming POST requests
app.use(helmet({ contentSecurityPolicy: false }));

app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

let isRecording = false;
let sessionName = "session1"; // Default session name
let currentFileName = null;
let selectedFileName = null;

const directoryPath = path.join(__dirname, "ReceivedData");

const uploadDir = path.join(__dirname, "ReceivedData", "Cam");

// Ensure the directory exists
if (!fs.existsSync(directoryPath)) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.ws("/upload", (ws, req) => {
  console.log("WebSocket connection established for /upload");

  let filename = null;
  let uploadPath = null;
  let writeStream = null;

  ws.on("message", (message) => {
    if (typeof message === "string") {
      // Received filename from client
      filename = path.basename(message); // Sanitize the filename
      uploadPath = path.join(uploadDir, filename);
      console.log("Receiving file:", filename);
      writeStream = fs.createWriteStream(uploadPath);
      writeStream.on("error", (err) => {
        console.error("WriteStream error:", err);
      });
    } else if (Buffer.isBuffer(message)) {
      // Received binary data (image)
      if (!writeStream) {
        console.error("Error: Write stream not initialized.");
        ws.close();
        return;
      }
      writeStream.write(message);
    }
  });

  ws.on("close", () => {
    if (writeStream) {
      writeStream.end();
      console.log("File saved:", filename);
    }
    console.log("WebSocket connection closed for /upload");
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
    if (writeStream) {
      writeStream.end();
    }
  });
});

app.get("/", (req, res) => {
  res.send("Hello! The server is running.");
});

// Control Endpoints
app.post("/start", (req, res) => {
  isRecording = true;
  const dateSuffix = new Date()
    .toISOString()
    .replace(/[:\-]/g, "_")
    .split(".")[0];
  currentFileName = `${sessionName}_${dateSuffix}.json`;
  selectedFileName = null;
  res.json({ message: "Recording started.", fileName: currentFileName });
});

app.post("/stop", (req, res) => {
  isRecording = false;
  currentFileName = null;
  res.json({ message: "Recording stopped." });
});

app.post("/set-session-name", (req, res) => {
  const { newSessionName } = req.body;
  if (isRecording) {
    res.status(400).json({
      message: "Cannot change session name while recording is in progress.",
    });
  } else {
    sessionName = newSessionName;
    res.json({ message: `Session name changed to ${sessionName}.` });
  }
});

app.get("/status", (req, res) => {
  res.json({
    isRecording,
    sessionName,
    currentFileName,
    selectedFileName,
    message: `Server is ${isRecording ? "recording" : "not recording"}.`,
  });
});

// Data Endpoint
app.get("/data", (req, res) => {
  let filePath;

  if (isRecording && currentFileName) {
    // When recording, use the current file
    filePath = path.join(directoryPath, currentFileName);
  } else if (selectedFileName) {
    // When not recording, use the selected file
    filePath = path.join(directoryPath, selectedFileName);
  } else {
    return res.json({ data: [] });
  }

  const sinceParam = req.query.since;
  const since = sinceParam ? Number(sinceParam) : null;

  if (sinceParam && isNaN(since)) {
    return res.status(400).json({
      message: 'Invalid "since" parameter. Must be a numeric timestamp.',
    });
  }

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading data file:", err);
      return res.status(500).json({ message: "Error reading data file." });
    }

    let allData = JSON.parse(data);

    allData.forEach((dp) => {
      dp.timestamp = Number(dp.timestamp);
    });

    // Filter data based on 'since' timestamp
    if (since) {
      allData = allData.filter((dp) => dp.timestamp > since);
    }

    res.json({ data: allData });
  });
});

// Endpoint to list all available data files
app.get("/list-files", (req, res) => {
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return res.status(500).json({ message: "Error reading data directory." });
    }

    // Filter JSON files
    const jsonFiles = files.filter((file) => file.endsWith(".json"));
    res.json({ files: jsonFiles });
  });
});

// Endpoint to select a data file
app.post("/select-file", (req, res) => {
  const { fileName } = req.body;

  // Check if the file exists
  const filePath = path.join(directoryPath, fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found." });
  }

  selectedFileName = fileName;
  res.json({ message: `File ${fileName} selected.` });
});

// Endpoint to clear the selected file
app.post("/clear-selected-file", (req, res) => {
  selectedFileName = null;
  res.json({ message: "Selected file cleared." });
});

// Route to handle POST requests
app.post("/", (req, res) => {
  if (!isRecording) {
    return res.status(200).json({ message: "Recording is stopped." });
  }

  if (!currentFileName) {
    return res
      .status(500)
      .json({ message: "Recording started but no file name is set." });
  }

  const receivedData = req.body;

  // Ensure that receivedData.data exists and is an array
  if (!receivedData.data || !Array.isArray(receivedData.data)) {
    return res
      .status(400)
      .json({ message: "Data must be an object with a 'data' array." });
  }

  const dataPoints = receivedData.data;

  // Validate each data point in the array
  for (let i = 0; i < dataPoints.length; i++) {
    const dataPoint = dataPoints[i];

    // Ensure that dataPoint.timestamp exists
    if (!dataPoint.timestamp) {
      return res
        .status(400)
        .json({ message: `Data point at index ${i} is missing 'timestamp'.` });
    }

    // Validate that the timestamp is a number
    let timestamp = Number(dataPoint.timestamp);
    if (isNaN(timestamp)) {
      return res.status(400).json({
        message: `Invalid timestamp format in data point at index ${i}. Must be a numeric value.`,
      });
    }

    // Adjust timestamp if necessary
    if (timestamp < 10000000000) {
      timestamp *= 1000;
      dataPoint.timestamp = timestamp;
    }
  }

  // Path to the session file
  const filePath = path.join(directoryPath, currentFileName);

  // Function to save data to file
  const saveDataToFile = (existingData) => {
    // Append the new data points to the existing data
    existingData.push(...dataPoints);

    fs.writeFile(filePath, JSON.stringify(existingData, null, 2), (err) => {
      if (err) {
        console.error("Error writing to file:", err);
        res.status(500).json({ message: "Error writing to file" });
      } else {
        res.json({ message: "Data saved successfully!" });
      }
    });
  };

  // Check if the session file exists
  if (fs.existsSync(filePath)) {
    // Append to the existing data
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading file:", err);
        res.status(500).json({ message: "Error reading file" });
        return;
      }

      let existingData;
      try {
        existingData = JSON.parse(data);
      } catch (parseErr) {
        console.error("Error parsing existing data file:", parseErr);
        existingData = [];
      }

      if (!Array.isArray(existingData)) {
        // If existing data is not an array, initialize it
        existingData = [];
      }

      saveDataToFile(existingData);
    });
  } else {
    // Create a new file with the data
    const sessionData = [...dataPoints]; // Copy of the data points array
    fs.writeFile(filePath, JSON.stringify(sessionData, null, 2), (err) => {
      if (err) {
        console.error("Error creating file:", err);
        res.status(500).json({ message: "Error creating file" });
      } else {
        res.json({ message: "File created and data saved successfully!" });
      }
    });
  }
}); // Route to handle POST requests
app.post("/", (req, res) => {
  if (!isRecording) {
    return res.status(200).json({ message: "Recording is stopped." });
  }

  if (!currentFileName) {
    return res
      .status(500)
      .json({ message: "Recording started but no file name is set." });
  }

  const receivedData = req.body;

  // Ensure that receivedData.data exists and is an array
  if (!receivedData.data || !Array.isArray(receivedData.data)) {
    return res
      .status(400)
      .json({ message: "Data must be an object with a 'data' array." });
  }

  const dataPoints = receivedData.data;

  // Validate each data point in the array
  for (let i = 0; i < dataPoints.length; i++) {
    const dataPoint = dataPoints[i];

    // Ensure that dataPoint.timestamp exists
    if (!dataPoint.timestamp) {
      return res
        .status(400)
        .json({ message: `Data point at index ${i} is missing 'timestamp'.` });
    }

    // Validate that the timestamp is a number
    let timestamp = Number(dataPoint.timestamp);
    if (isNaN(timestamp)) {
      return res.status(400).json({
        message: `Invalid timestamp format in data point at index ${i}. Must be a numeric value.`,
      });
    }

    // Adjust timestamp if necessary
    if (timestamp < 10000000000) {
      timestamp *= 1000;
      dataPoint.timestamp = timestamp;
    }
  }

  // Path to the session file
  const filePath = path.join(directoryPath, currentFileName);

  // Function to save data to file
  const saveDataToFile = (existingData) => {
    // Append the new data points to the existing data
    existingData.push(...dataPoints);

    fs.writeFile(filePath, JSON.stringify(existingData, null, 2), (err) => {
      if (err) {
        console.error("Error writing to file:", err);
        res.status(500).json({ message: "Error writing to file" });
      } else {
        res.json({ message: "Data saved successfully!" });
      }
    });
  };

  // Check if the session file exists
  if (fs.existsSync(filePath)) {
    // Append to the existing data
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading file:", err);
        res.status(500).json({ message: "Error reading file" });
        return;
      }

      let existingData;
      try {
        existingData = JSON.parse(data);
      } catch (parseErr) {
        console.error("Error parsing existing data file:", parseErr);
        existingData = [];
      }

      if (!Array.isArray(existingData)) {
        // If existing data is not an array, initialize it
        existingData = [];
      }

      saveDataToFile(existingData);
    });
  } else {
    // Create a new file with the data
    const sessionData = [...dataPoints]; // Copy of the data points array
    fs.writeFile(filePath, JSON.stringify(sessionData, null, 2), (err) => {
      if (err) {
        console.error("Error creating file:", err);
        res.status(500).json({ message: "Error creating file" });
      } else {
        res.json({ message: "File created and data saved successfully!" });
      }
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
