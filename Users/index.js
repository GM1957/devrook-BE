const {
  createUser,
  updateUser,
  deleteUser,
  getUserByUserName,
  getUserByUserId
} = require("./users");

const {
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

exports.main = async event => {
  console.log("Input to the lambda", event);

  const { action } = event;
  delete event.action;

  if (action === "create") {
    const { details } = event;
    event = {
      ...event,
      ...details
    };
    delete event.details;

    return createUser(event);
  } else if (action === "update") {
    const { details } = event;

    event = {
      ...event,
      ...details
    };
    delete event.details;

    return updateUser(event);
  } else if (action === "delete") {
    return deleteUser(event);
  } else if (action === "getUserByUserName") {
    const { details } = event;

    event = {
      ...event,
      ...details
    };
    delete event.details;

    return getUserByUserName(event);
  } else if (action === "getUserByUserId") {
    return getUserByUserId(event);
  } else {
    return badRequestResponse(action);
  }
};
