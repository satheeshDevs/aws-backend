const express = require("express");
const cors = require("cors");
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const app = express();

// CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());

// Environment variables
const PORT = Number(process.env.PORT) || 5000;
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

if (!S3_BUCKET_NAME) {
  console.warn("S3_BUCKET_NAME environment variable is not set.");
}

// ECS uses ecsTaskRole automaticalsly.
// No AWS access keys are required in the code.
const s3Client = new S3Client({
  region: AWS_REGION,
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
  });
});

// Hello API
app.get("/api/hello", (req, res) => {
  res.json({
    message: "Hello from ECS!",
  });
});

// Users API
app.get("/api/users", (req, res) => {
  res.json({
    users: [
      { id: 1, name: "John" },
      { id: 2, name: "David" },
    ],
  });
});

// Generate temporary S3 download URL
// Example: GET /files/download-url?key=test.txt
app.get("/files/download-url", async (req, res) => {
  try {
    if (!S3_BUCKET_NAME) {
      return res.status(500).json({
        message: "S3_BUCKET_NAME is not configured",
      });
    }

    const { key } = req.query;

    if (!key) {
      return res.status(400).json({
        message: "key query parameter is required",
      });
    }

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
    });

    res.json({
      message: "Temporary download URL generated",
      key,
      expiresIn: 300,
      url,
    });
  } catch (error) {
    console.error("Error generating S3 download URL:", error);

    res.status(500).json({
      message: "Failed to generate S3 download URL",
    });
  }
});

// Generate temporary S3 upload URL
// Example: GET /files/upload-url?key=images/sample.jpg
app.get("/files/upload-url", async (req, res) => {
  try {
    if (!S3_BUCKET_NAME) {
      return res.status(500).json({
        message: "S3_BUCKET_NAME is not configured",
      });
    }

    const { key } = req.query;

    if (!key) {
      return res.status(400).json({
        message: "key query parameter is required",
      });
    }

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
    });

    res.json({
      message: "Temporary upload URL generated",
      key,
      expiresIn: 300,
      url,
    });
  } catch (error) {
    console.error("Error generating S3 upload URL:", error);

    res.status(500).json({
      message: "Failed to generate S3 upload URL",
    });
  }
});

// Start server only when running this file directly
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`AWS region: ${AWS_REGION}`);
    console.log(`S3 bucket: ${S3_BUCKET_NAME || "not configured"}`);
  });
}

// Export Express app for testing
module.exports = app;