const {
  getTag,
  followTag,
  followTagInBulk,
  unFollowTag,
  createDefaultTags,
  getPopularTags,
  createTag,
  increaseTagPopularity
} = require("./tags");

const {
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

exports.main = async event => {
  console.log("Input to the Tags lambda", event);

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

  if (action === "createDefaultTags") {
    return createDefaultTags(event);
  } else if (action === "getTag") {
    return getTag(event);
  } else if (action === "getPopularTags") {
    return getPopularTags(event);
  } else if (action === "followTag") {
    return followTag(event);
  } else if (action === "followTagInBulk") {
    return followTagInBulk(event);
  } else if (action === "unFollowTag") {
    return unFollowTag(event);
  } else {
    return badRequestResponse(action);
  }
};
