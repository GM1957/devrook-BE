const {
  putItem,
  updateItem,
  deleteItem,
  queryItem,
  queryItemPaginated
} = require("../Utils/DBClient");

const {
  createResponse,
  updateResponse,
  okResponse,
  deleteResponse,
  internalServerError,
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

const { customValidator } = require("../Utils/customValidator");

function createPost(event) {
  console.log("Inside createPost function", event);

  const firstStageErrors = customValidator(event, [
    "userId",
    "postType",
    "title"
  ]);
  if (firstStageErrors.length)
    return badRequestResponse("missing mandetory fields", firstStageErrors);

  if (event.postType === "blog") {
    const secondStageErrors = customValidator(event, ["content"]);
    if (secondStageErrors.length)
      return badRequestResponse("missing mandetory fields", secondStageErrors);
  }

  const { userId, postType, title, content } = event;

  const params = {
    TableName: PostsTable,
    Item: {
      userId,
      postType,
      title,
      content: content ? content : {},
      coverImage: coverImage ? coverImage : "",
      upVote: 0,
      downVote: 0,
      like: 0,
      createdAt: new Date(Date.now()).toISOString(),
      isDeactivated: "false"
    }
  };

  return putItem(params)
    .then(() => okResponse(`${postType} created successfully`))
    .catch(err => internalServerError(err, `unable to create ${postType}`));
}

module.exports = { createPost };
