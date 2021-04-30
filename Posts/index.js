const { createPost } = require("./posts");

const {
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

exports.main = async event => {
  console.log("Input to the Posts lambda", event);

  const { action } = event;
  delete event.action;

  if (action === "create") {
    const { details } = event;

    if (details.userId) delete details.userId;

    event = {
      ...event,
      ...details
    };

    delete event.details;

    return createPost(event);
  } else {
    return badRequestResponse("action not found", action);
  }
};
