const {
  createPost,
  getAllPosts,
  getPersonalizedPosts,
  getFullPost,
  updatePost,
  deletePost,
  votePost,
  devFeed,
  devFeedPublic,
  tagFeed,
  devPosts
} = require("./posts");

const {
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

exports.main = async event => {
  console.log("Input to the Posts lambda", event);

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
    return createPost(event);
  } else if (action === "updatePost") {
    return updatePost(event);
  } else if (action === "votePost") {
    return votePost(event);
  } else if (action === "getAllPosts") {
    return getAllPosts(event);
  } else if (action === "getPersonalizedPosts") {
    return getPersonalizedPosts(event);
  } else if (action === "getFullPost") {
    return getFullPost(event);
  } else if (action === "deletePost") {
    return deletePost(event);
  } else if (action === "devFeed") {
    return devFeed(event);
  } else if (action === "devFeedPublic") {
    return devFeedPublic(event);
  } else if (action === "tagFeed") {
    return tagFeed(event);
  } else if (action === "devPosts") {
    return devPosts(event);
  } else {
    return badRequestResponse("action not found", action);
  }
};
