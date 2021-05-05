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

  const { action } = event;
  delete event.action;

  if (action === "createDefaultTags") {
    return createDefaultTags(event);
  } else if (action === "getTag") {
    return getTag(event);
  } else if (action === "getPopularTags") {
    return getPopularTags(event);
  } else if (action === "followTag") {
    const { details } = event;

    if (details) {
      if (details.userId) delete details.userId;
    }

    event = {
      ...event,
      ...details
    };

    delete event.details;

    return followTag(event);
  } else if (action === "followTagInBulk") {
    const { details } = event;

    if (details) {
      if (details.userId) delete details.userId;
    }

    event = {
      ...event,
      ...details
    };

    delete event.details;

    return followTagInBulk(event);
  } else if (action === "unFollowTag") {
    const { details } = event;

    if (details) {
      if (details.userId) delete details.userId;
    }

    event = {
      ...event,
      ...details
    };

    delete event.details;

    return unFollowTag(event);
  } else {
    return badRequestResponse(action);
  }
};
