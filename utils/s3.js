const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

async function uploadFileToS3(fileBuffer, fileName, mimeType) {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileName, // file path inside bucket
    Body: fileBuffer, // file content
    ContentType: mimeType, // e.g., "application/pdf"
  };

  return s3.upload(params).promise(); // returns { Location, Key, Bucket, ... }
}

module.exports = { uploadFileToS3 };
