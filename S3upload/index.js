const {
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

const { getPresignedUploadUrl } = require("./getPresignedUploadUrl");

exports.main = async event => {
  console.log("Input to the lambda", event);

  const { action } = event;
  delete event.action;

  if (action === "getPresignedUploadUrl") {
    const { details } = event;
    event = {
      ...event,
      ...details
    };
    delete event.details;

    return getPresignedUploadUrl(event);
  }
  return badRequestResponse("action not found", action);
};