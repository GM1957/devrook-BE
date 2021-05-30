const { createResponse, getResponses } = require("./responses");

const {
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

exports.main = event => {
  console.log("Input to the Messages Lambda", event);

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

  if (action === "createResponse") {
    return createResponse(event);
  } else if (action === "getResponses") {
    return getResponses(event);
  } else {
    return badRequestResponse("no route found");
  }
};
