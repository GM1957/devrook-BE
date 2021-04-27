const AWS = require("aws-sdk");
const region = process.env.REGION;
AWS.config.update({ region });
const s3 = new AWS.S3();

const { customValidator } = require("../Utils/customValidator");

async function getPresignedUploadUrl(event) {
  const errors = customValidator(event, ["bucket", "directory", "fileName"]);
  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { bucket, directory, fileName } = event;

  const key = `${directory}/${fileName}`;

  const url = await s3.getSignedUrl("putObject", {
    Bucket: bucket,
    Key: key,
    ContentType: "image/*",
    Expires: 1000
  });
  return url;
}

module.exports = { getPresignedUploadUrl };
