const uuid = require("uuid");

const { createTag, increaseTagPopularity } = require("../Tags/tags");
const { getUserByUserId } = require("../Users/users");
const {
  containsExpresseionGeneratorForOR
} = require("../Utils/containsExpresseionGeneratorForOR");

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
    "title",
    "tags"
  ]);

  if (firstStageErrors.length)
    return badRequestResponse("missing mandetory fields", firstStageErrors);

  if (event.postType === "blog") {
    const secondStageErrors = customValidator(event, ["content"]);
    if (secondStageErrors.length)
      return badRequestResponse("missing mandetory fields", secondStageErrors);
  }

  const { userId, postType, title, content, coverImage, tags } = event;

  if (tags.length > 5)
    return badRequestResponse("you cannot add more that 5 tags");
  if (tags.length < 1)
    return badRequestResponse("you have to choose atleast one tag");

  const titleArr = title.split(" ");

  let hashedUrl = "";

  titleArr.forEach(ele => {
    if (ele.length) hashedUrl += ele + "-";
  });

  hashedUrl += uuid.v4().substring(0, 6);

  const params = {
    TableName: "PostsTable",
    Item: {
      hashedUrl,
      userId,
      postType,
      title,
      tags,
      content: content ? content : {},
      coverImage: coverImage ? coverImage : "",
      upVote: 0,
      downVote: 0,
      like: 0,
      responses: 0,
      createdAt: new Date(Date.now()).toISOString(),
      isDeactivated: "false"
    }
  };

  return putItem(params)
    .then(async () => {
      try {
        const promises = [];
        const filterArr = [];

        tags.forEach(tag => {
          if (!filterArr.includes(tag)) {
            promises.push(increaseTagPopularity({ tagName: tag }));
            promises.push(createTag({ tagName: tag }));
            filterArr.push(tag);
          }
        });
        await Promise.all(promises);
      } catch (err) {
        console.log(err);
      }
      return createResponse(`${postType} created successfully`);
    })
    .catch(err => internalServerError(err, `unable to create ${postType}`));
}

async function getFullPost(event) {
  console.log("Inside getFullPost function", event);

  const errors = customValidator(event, ["postUrl"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { postUrl } = event;

  const postParams = {
    TableName: "PostsTable",
    KeyConditionExpression: "hashedUrl = :hashedUrl",
    ExpressionAttributeValues: {
      ":hashedUrl": postUrl
    }
  };

  const post = await queryItem(postParams);

  if (!post.length) return badRequestResponse("post not found");

  const postObj = {};

  const postAuthorId = post[0].userId;
  delete post[0].userId;
  postObj.postDetails = post[0];

  const authorDetails = await getUserByUserId({ userId: postAuthorId });
  delete authorDetails.data[0].userId;
  postObj.authorDetails = authorDetails.data[0];

  return okResponse("fetched full post", postObj);
}

async function updatePost(event) {
  console.log("Inside updatePost function", event);

  const errors = customValidator(event, ["userId", "postUrl"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId, postUrl } = event;

  delete event.userId;
  delete event.postUrl;
  if (event.hashedUrl) delete event.hashedUrl;
  if (event.createdAt) delete event.createdAt;
  if (event.upVote) delete event.upVote;
  if (event.downVote) delete event.downVote;
  if (event.like) delete event.like;
  if (event.responses) delete event.responses;

  const getPostParams = {
    TableName: "PostsTable",
    IndexName: "byhashedUrlAndUserId",
    KeyConditionExpression: "hashedUrl = :hashedUrl AND userId = :userId",
    ExpressionAttributeValues: {
      ":hashedUrl": postUrl,
      ":userId": userId
    }
  };

  const post = await queryItem(getPostParams);
  if (!post.length) return badRequestResponse("post not found");

  const eventArr = Objects.keys(event);
  const postArr = Objects.keys(post[0]);

  eventArr.forEach(item => {
    if (!postArr.includes(item)) delete event[item];
  });

  let updateExpression = "set";
  let ExpressionAttributeNames = {};
  let ExpressionAttributeValues = {};
  for (const property in event) {
    updateExpression += ` #${property} = :${property} ,`;
    ExpressionAttributeNames["#" + property] = property;
    ExpressionAttributeValues[":" + property] = event[property];
  }

  // removing last comma
  updateExpression = updateExpression.slice(0, -1);

  const params = {
    TableName: "PostsTable",
    Key: {
      userId: post[0].hashedUrl,
      createdAt: post[0].createdAt
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: ExpressionAttributeNames,
    ExpressionAttributeValues: ExpressionAttributeValues
  };

  return updateItem(params)
    .then(() =>
      updateResponse(`post update successfully of the title ${postUrl}`)
    )
    .catch(err =>
      internalServerError(
        err,
        `unable to update the post with post title : ${postUrl}`
      )
    );
}

function getAllPosts(event) {
  console.log("Inside getAllPosts function", event);

  const { limit, LastEvaluatedKey, postType } = event;

  const params = {
    TableName: "PostsTable",
    ScanIndexForward: false,
    IndexName: postType ? "byPostType" : "byIsDeactivated",
    ProjectionExpression:
      "#c, #co, #tg, #ti, #lk, #rs, createdAt, downVote,  upVote, hashedUrl,  postType",
    ExpressionAttributeNames: {
      "#c": "content",
      "#co": "coverImage",
      "#tg": "tag",
      "#ti": "title",
      "#lk": "like",
      "#rs": "responses"
    },
    KeyConditionExpression: postType
      ? "postType = :postType"
      : "isDeactivated = :isDeactivated",
    ExpressionAttributeValues: postType
      ? {
          ":postType": postType
        }
      : {
          ":isDeactivated": "false"
        }
  };

  if (limit && limit != "false") {
    params.Limit = limit;
  }
  if (LastEvaluatedKey && LastEvaluatedKey != "false") {
    params.ExclusiveStartKey = LastEvaluatedKey;
  }
  return queryItemPaginated(params)
    .then(result => okResponse("fetched result", result))
    .catch(err => internalServerError(err, "failed to fetch data"));
}

async function getPersonalizedPosts(event) {
  console.log("Inside getPersonalizedPosts function", event);

  const errors = customValidator(event, ["userId"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId, limit, LastEvaluatedKey, postType } = event;

  const user = await getUserByUserId({ userId });

  const expressions = await containsExpresseionGeneratorForOR(
    "tags",
    Object.keys(user.data[0].tags)
  );

  console.log(expressions);

  const params = {
    TableName: "PostsTable",
    IndexName: postType ? "byPostType" : "byIsDeactivated",
    ProjectionExpression:
      "#c, #co, #tg, #ti, #lk, #rs, createdAt, downVote,  upVote, hashedUrl,  postType",
    ExpressionAttributeNames: {
      "#c": "content",
      "#co": "coverImage",
      "#tg": "tag",
      "#ti": "title",
      "#lk": "like",
      "#rs": "responses"
    },
    ScanIndexForward: false,
    FilterExpression: expressions.expression,
    KeyConditionExpression: postType
      ? "postType = :postType"
      : "isDeactivated = :isDeactivated",
    ExpressionAttributeValues: postType
      ? {
          ...expressions.values,
          ":postType": postType
        }
      : {
          ...expressions.values,
          ":isDeactivated": "false"
        }
  };

  if (limit && limit != "false") {
    params.Limit = limit;
  }
  if (LastEvaluatedKey && LastEvaluatedKey != "false") {
    params.ExclusiveStartKey = LastEvaluatedKey;
  }
  return queryItemPaginated(params)
    .then(result => okResponse("fetched result", result))
    .catch(err => internalServerError(err, "failed to fetch data"));
}

async function deletePost(event) {
  console.log("Inside deletePost function", event);

  const errors = customValidator(event, ["userId", "postUrl"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { postUrl, userId } = event;

  const getPostParams = {
    TableName: "PostsTable",
    IndexName: "byhashedUrlAndUserId",
    KeyConditionExpression: "hashedUrl = :hashedUrl AND userId = :userId",
    ExpressionAttributeValues: {
      ":hashedUrl": postUrl,
      ":userId": userId
    }
  };

  const post = await queryItem(getPostParams);
  if (!post.length) return badRequestResponse("post not found");

  if (post[0].postType === "question" && post[0].responses > 1)
    return badRequestResponse(
      "Sorry you cannot delete your question because people has gave their effort in your question"
    );

  const deletePostParams = {
    TableName: "PostsTable",
    Key: {
      hashedUrl: post[0].hashedUrl,
      createdAt: post[0].createdAt
    }
  };

  return deleteItem(deletePostParams)
    .then(() =>
      deleteResponse(`post deleted successfully with the postId: ${postUrl}`)
    )
    .catch(err =>
      internalServerError(
        err,
        `unable to delete the post with the postId : ${postUrl}`
      )
    );
}

async function votePost(event) {
  console.log("Inside votePost function", event);

  const errors = customValidator(event, ["userId", "voteType", "postUrl"]);
  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId, voteType, postUrl } = event;

  // Conditions can be of length 1 or 2 only thats why we have to use voteType as filter expression here
  const voteMappingQueryParams = {
    TableName: "VoteMappingTable",
    IndexName: "byVoteAndUserId",
    KeyConditionExpression: "voteId = :voteId AND userId = :userId",
    FilterExpression: "voteType = :voteType",
    ExpressionAttributeValues: {
      ":voteId": postUrl,
      ":userId": userId,
      ":voteType": voteType
    }
  };

  const postParams = {
    TableName: "PostsTable",
    KeyConditionExpression: "hashedUrl = :hashedUrl",
    ExpressionAttributeValues: {
      ":hashedUrl": postUrl
    }
  };

  const prevVotingDetails = await queryItem(voteMappingQueryParams);
  const postDetails = await queryItem(postParams);

  const promises = [];
  let ExpressionAttributeValues = {};

  if (!prevVotingDetails.length) {
    const voteMappingInsertParams = {
      TableName: "VoteMappingTable",
      Item: {
        userId,
        voteType,
        voteId: postUrl,
        createdAt: new Date(Date.now()).toISOString(),
        isDeactivated: "false"
      }
    };
    promises.push(putItem(voteMappingInsertParams));

    ExpressionAttributeValues[":newValue"] =
      parseInt(postDetails[0][voteType]) + 1;
  } else if (prevVotingDetails.length && voteType === "like") {
    const voteMappingDeleteParams = {
      TableName: "VoteMappingTable",
      Key: {
        voteId: prevVotingDetails[0].voteId,
        createdAt: prevVotingDetails[0].createdAt
      }
    };
    promises.push(deleteItem(voteMappingDeleteParams));

    ExpressionAttributeValues[":newValue"] =
      parseInt(postDetails[0][voteType]) - 1;
  }

  const updatePostParams = {
    TableName: "PostsTable",
    Key: {
      hashedUrl: postDetails[0].hashedUrl,
      createdAt: postDetails[0].createdAt
    },
    UpdateExpression: "set #name = :newValue",
    ExpressionAttributeNames: { "#name": voteType },
    ExpressionAttributeValues: ExpressionAttributeValues
  };

  promises.push(updateItem(updatePostParams));

  return Promise.all(promises)
    .then(() => okResponse(`${voteType} : of ${postUrl} has done successfully`))
    .catch(err =>
      internalServerError(err, `unable to to ${voteType} the ${postUrl}`)
    );
}

module.exports = {
  createPost,
  getAllPosts,
  getPersonalizedPosts,
  getFullPost,
  updatePost,
  deletePost,
  votePost
};
