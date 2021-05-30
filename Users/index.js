const {
  createUser,
  updateUser,
  deleteUser,
  getUserByUserNamePublicUse,
  getUserByUserId,
  topReputedUsers,
  followUserInBulk,
  getUserPreviousVotes,
  ifIfollowChecker,
  followUnfollowUser,
  usersIFollow,
  myFollowers
} = require("./users");

const {
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

exports.main = async event => {
  console.log("Input to the Users lambda", event);

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

  if (action === "create") {
    return createUser(event);
  } else if (action === "update") {
    return updateUser(event);
  } else if (action === "followUserInBulk") {
    return followUserInBulk(event);
  } else if (action === "getUserPreviousVotes") {
    return getUserPreviousVotes(event);
  } else if (action === "delete") {
    return deleteUser(event);
  } else if (action === "getUserByUserName") {
    return getUserByUserNamePublicUse(event);
  } else if (action === "getUserByUserId") {
    return getUserByUserId(event);
  } else if (action === "topReputedUsers") {
    return topReputedUsers(event);
  } else if (action === "ifIfollowChecker") {
    return ifIfollowChecker(event);
  } else if (action === "followUnfollowUser") {
    return followUnfollowUser(event);
  } else if (action === "usersIFollow") {
    return usersIFollow(event);
  } else if (action === "myFollowers") {
    return myFollowers(event);
  } else {
    return badRequestResponse(action);
  }
};
