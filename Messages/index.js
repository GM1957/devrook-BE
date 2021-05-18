const { chattedWithIds, fullChat } = require("./messages");
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

  if (action === "chattedWithIds") {
    return chattedWithIds(event);
  } else if (action === "fullChat") {
    return fullChat(event);
  } else {
    return badRequestResponse("no route found");
  }
};
