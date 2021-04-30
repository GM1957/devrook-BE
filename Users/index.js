const {
  createUser,
  updateUser,
  deleteUser,
  getUserByUserNamePublicUse,
  getUserByUserId,
  topReputedUsers,
  followUser,
  followUserInBulk,
  unFollowUser,
  usersIFollow,
  myFollowers
} = require("./users");

const {
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

exports.main = async event => {
  console.log("Input to the Users lambda", event);

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

    return createUser(event);
  } else if (action === "update") {
    const { details } = event;
    if (details.userId) delete details.userId;

    event = {
      ...event,
      ...details
    };
    delete event.details;

    return updateUser(event);
  } else if (action === "delete") {
    return deleteUser(event);
  } else if (action === "getUserByUserName") {
    return getUserByUserNamePublicUse(event);
  } else if (action === "getUserByUserId") {
    return getUserByUserId(event);
  } else if (action === "topReputedUsers") {
    return topReputedUsers(event);
  } else if (action === "followUserInBulk") {
    const { details } = event;
    if (details.userId) delete details.userId;
    event = {
      ...event,
      ...details
    };

    delete event.details;
    return followUserInBulk(event);
  } else {
    return badRequestResponse(action);
  }
};
