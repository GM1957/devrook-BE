const { postSearch, devSearch } = require("./search");

const {
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

exports.main = async event => {
  console.log("Input to the Search lambda", event);

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

  if (action === "postSearch") {
    return postSearch(event);
  } else if (action === "devSearch") {
    return devSearch(event);
  } else {
    return badRequestResponse("action not found", action);
  }
};
