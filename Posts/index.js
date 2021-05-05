const {
  createPost,
  getAllPosts,
  getPersonalizedPosts,
  getFullPost,
  updatePost,
  deletePost,
  votePost
} = require("./posts");

const {
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

exports.main = async event => {
  console.log("Input to the Posts lambda", event);

  const { action } = event;
  delete event.action;

  if (action === "create") {
    const { details } = event;

    if (details) {
      if (details.userId) delete details.userId;
    }

    event = {
      ...event,
      ...details
    };

    delete event.details;

    return createPost(event);
  } else if (action === "updatePost") {
    const { details } = event;

    if (details) {
      if (details.userId) delete details.userId;
    }

    event = {
      ...event,
      ...details
    };

    delete event.details;

    return updatePost(event);
  } else if (action === "votePost") {
    const { details } = event;

    if (details) {
      if (details.userId) delete details.userId;
    }

    event = {
      ...event,
      ...details
    };

    delete event.details;

    return votePost(event);
  } else if (action === "getAllPosts") {
    return getAllPosts(event);
  } else if (action === "getPersonalizedPosts") {
    return getPersonalizedPosts(event);
  } else if (action === "getFullPost") {
    return getFullPost(event);
  } else if (action === "deletePost") {
    return deletePost(event);
  } else {
    return badRequestResponse("action not found", action);
  }
};
