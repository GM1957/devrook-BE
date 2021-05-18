const {
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

const { getPresignedUploadUrl } = require("./getPresignedUploadUrl");

exports.main = async event => {
  console.log("Input to the S3Upload lambda", event);

  const { action, details } = event;
  delete event.action;

  if (details) {
    if (details.userId) delete details.userId;
    event = {
      ...event,
      ...details
    };

    delete event.details;
  }

  if (action === "getPresignedUploadUrl") {
    return getPresignedUploadUrl(event);
  }
  return badRequestResponse("action not found", action);
};
