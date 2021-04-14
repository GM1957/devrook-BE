const {
  createTag,
  getTag,
  followTag,
  unFollowTag,
  createDefaultTags,
  getPopularTags
} = require("./tags");

const {
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

exports.main = async event => {
  console.log("Input to the lambda", event);

  const { action } = event;
  delete event.action;

  if (action === "createDefaultTags") {
    return createDefaultTags(event);
  } else if (action === "create") {
    const { details } = event;

    event = {
      ...event,
      ...details
    };
    delete event.details;

    return createTag(event);
  } else if (action === "getTag") {
    return getTag(event);
  } else if (action === "getPopularTags") {
    return getPopularTags();
  } else if (action === "followTag") {
    const { details } = event;

    event = {
      ...event,
      ...details
    };

    delete event.details;

    return followTag(event);
  } else if (action === "unFollowTag") {
    const { details } = event;

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
