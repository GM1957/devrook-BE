const {
  queryItem,
  putItem,
  updateItem,
  queryItemPaginated,
} = require("../Utils/DBClient");

const uuid = require("uuid");

const {
  okResponse,
  internalServerError,
  badRequestResponse,
} = require("../Utils/responseCodes").responseMessages;

const { customValidator } = require("../Utils/customValidator");

async function createResponse(event) {
  console.log("Inside createResponse function", event);

  const errors = customValidator(event, ["userId", "postUrl", "responseBody"]);
  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId, postUrl, responseBody } = event;

  if (!responseBody.length)
    return badrequestResponse("response body cannot be empty");

  const getPostParams = {
    TableName: "PostsTable",
    KeyConditionExpression: "hashedUrl = :hashedUrl",
    ExpressionAttributeValues: {
      ":hashedUrl": postUrl,
    },
  };

  const post = await queryItem(getPostParams);

  if (!post.length) return badRequestResponse("post not found");

  const promises = [];

  const responseId = uuid.v4();
  const createParams = {
    TableName: "ResponsesTable",
    Item: {
      responseId,
      postUrl,
      userId,
      responseBody,
      upVote: 0,
      downVote: 0,
      totalVotes: 0,
      createdAt: new Date(Date.now()).toISOString(),
      isDeactivated: "false",
    },
  };

  promises.push(putItem(createParams));

  const updatePostParams = {
    TableName: "PostsTable",
    Key: { hashedUrl: postUrl, createdAt: post[0].createdAt },
    UpdateExpression: "set responses = :newResponses",
    ExpressionAttributeValues: {
      ":newResponses": parseInt(post[0].responses) + 1,
    },
  };

  promises.push(updateItem(updatePostParams));

  return Promise.all(promises)
    .then(() =>
      okResponse("Response hasbeen given successfully", { responseId })
    )
    .catch((err) => internalServerError(err));
}

function getResponses(event) {
  console.log("Inside getResponses function", event);

  const errors = customValidator(event, ["postUrl"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { postUrl } = event;

  const findParams = {
    TableName: "ResponsesTable",
    ScanIndexForward: false,
    IndexName: "byPostUrlAndUpvote",
    KeyConditionExpression: "postUrl = :postUrl",
    ExpressionAttributeValues: {
      ":postUrl": postUrl,
    },
  };

  return queryItemPaginated(findParams)
    .then(async (result) => {
      if (result.Items.length) {
        const promises = [];

        result.Items.forEach((item) => {
          const params = {
            TableName: "UsersTable",
            KeyConditionExpression: "userId = :userId",
            ProjectionExpression: "userName, profilePicture, #n",
            ExpressionAttributeNames: { "#n": "name" },
            ExpressionAttributeValues: {
              ":userId": item.userId,
            },
          };

          promises.push(queryItem(params));
          delete item.userId;
        });

        result.users = await Promise.all(promises);
      }

      return okResponse("fetched items", result);
    })
    .catch((err) => internalServerError(err));
}

module.exports = { createResponse, getResponses };
