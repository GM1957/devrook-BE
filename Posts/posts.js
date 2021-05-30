const uuid = require("uuid");

const { createTag, increaseTagPopularity } = require("../Tags/tags");
const {
  getUserByUserId,
  getUserByUserName,
  increaseUserReputation,
  decreaseUserReputation
} = require("../Users/users");
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

  if (event.postType === "false") delete event.postType;

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

  if (event.postType === "false") delete event.postType;

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

  const errors = customValidator(event, ["userId", "voteType", "id", "type"]);
  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  // type is to define its post or response
  const { userId, voteType, id, type } = event;

  const postOrResFindParams = {
    TableName: type === "post" ? "PostsTable" : "ResponsesTable",
    KeyConditionExpression:
      type === "post" ? "hashedUrl = :hashedUrl" : "responseId = :responseId",
    ExpressionAttributeValues:
      type === "post"
        ? {
            ":hashedUrl": id
          }
        : { ":responseId": id }
  };

  const postOrResDetails = await queryItem(postOrResFindParams);

  if (!postOrResDetails.length)
    return badRequestResponse(
      `no post or response found found with the id: ${id}`
    );

  // first check the previous vote mappings for the user and the post
  const voteMappingQueryParams = {
    TableName: "VoteMappingTable",
    KeyConditionExpression: "voteId = :voteId AND userId = :userId",
    ExpressionAttributeValues: {
      ":voteId": id,
      ":userId": userId
    }
  };

  const previousVotingDetails = await queryItem(voteMappingQueryParams);

  const promises = [];

  // now we have to check if previous vote is present and voteType is same or not
  // -- if present and same vote type then delete -- else update with new vote type

  const insertParams = {
    TableName: "VoteMappingTable",
    Item: {
      userId,
      voteType,
      voteId: id,
      createdAt: new Date(Date.now()).toISOString(),
      isDeactivated: "false"
    }
  };

  const deleteParams = {
    TableName: "VoteMappingTable",
    Key: {
      voteId: id,
      userId
    }
  };

  let valuesForUpdatePostOrResponse = {};

  if (previousVotingDetails.length) {
    // check voteType same or not
    if (previousVotingDetails[0].voteType === voteType) {
      // delete vote mapping
      promises.push(deleteItem(deleteParams));

      // if like or upvote decrease reputation else if downvote increase reputation
      if (voteType === "like" || voteType === "upVote") {
        promises.push(
          decreaseUserReputation({
            userId: postOrResDetails[0].userId,
            decreaseBy: 10
          })
        );
      }

      // for downvote we will only increase or decrease reputation by 5
      else if (voteType === "downVote") {
        promises.push(
          increaseUserReputation({
            userId: postOrResDetails[0].userId,
            increaseBy: 5
          })
        );
      }

      // based on the voteType adjust post like upvote or downvote
      valuesForUpdatePostOrResponse[":newValue"] =
        parseInt(postOrResDetails[0][voteType]) - 1;
    } else {
      // update which is equals insert
      promises.push(putItem(insertParams));

      // if like or upvote increase reputation else decrease reputation
      if (voteType === "like" || voteType === "upVote") {
        promises.push(
          increaseUserReputation({
            userId: postOrResDetails[0].userId,
            increaseBy: 10
          })
        );
      }

      // for downvote we will only increase or decrease reputation by 5
      else if (voteType === "downVote") {
        promises.push(
          decreaseUserReputation({
            userId: postOrResDetails[0].userId,
            decreaseBy: 5
          })
        );
      }

      // based on the voteType adjust post like upvote or downvote
      valuesForUpdatePostOrResponse[":newValue"] =
        parseInt(postOrResDetails[0][voteType]) + 1;
    }
  } else {
    // insert vote mapping
    promises.push(putItem(insertParams));

    // if like or upvote increase reputation else decrease reputation
    if (voteType === "like" || voteType === "upVote") {
      promises.push(
        increaseUserReputation({
          userId: postOrResDetails[0].userId,
          increaseBy: 10
        })
      );
    }

    // for downvote we will only increase or decrease reputation by 5
    else if (voteType === "downVote") {
      promises.push(
        decreaseUserReputation({
          userId: postOrResDetails[0].userId,
          decreaseBy: 5
        })
      );
    }

    // based on the voteType adjust post like upvote or downvote
    valuesForUpdatePostOrResponse[":newValue"] =
      parseInt(postOrResDetails[0][voteType]) + 1;
  }

  const updatePostOrResponseParams = {
    TableName: type === "post" ? "PostsTable" : "ResponsesTable",
    Key:
      type === "post"
        ? {
            hashedUrl: postOrResDetails[0].hashedUrl,
            createdAt: postOrResDetails[0].createdAt
          }
        : {
            responseId: postOrResDetails[0].responseId
          },
    UpdateExpression: "set #name = :newValue",
    ExpressionAttributeNames: { "#name": voteType },
    ExpressionAttributeValues: valuesForUpdatePostOrResponse
  };

  promises.push(updateItem(updatePostOrResponseParams));

  return Promise.all(promises)
    .then(() => okResponse(`${voteType} : of ${id} has done successfully`))
    .catch(err =>
      internalServerError(err, `unable to to ${voteType} the ${id}`)
    );
}

async function devFeed(event) {
  console.log("Inside devFeed function", event);

  const errors = customValidator(event, ["userId"]);
  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId, limit, LastEvaluatedKey } = event;
  let returnObj = {};

  const followingDevsParams = {
    TableName: "FollowUserMappingTable",
    IndexName: "byFollowedById",
    ScanIndexForward: false,
    KeyConditionExpression: "followedById = :userId",
    ExpressionAttributeValues: {
      ":userId": userId
    }
  };

  if (limit && limit != "false") {
    followingDevsParams.Limit = limit;
  }
  if (LastEvaluatedKey && LastEvaluatedKey != "false") {
    followingDevsParams.ExclusiveStartKey = LastEvaluatedKey;
  }

  const result = await queryItemPaginated(followingDevsParams);
  returnObj.LastEvaluatedKey = result.LastEvaluatedKey
    ? result.LastEvaluatedKey
    : "false";

  const promises = [];

  // or what we can do is get the recent posts first and then filter them by users i follow

  result.Items.forEach(item => {
    const queryParams = {
      TableName: "PostsTable",
      IndexName: "byUserId",
      ScanIndexForward: false,
      Limit: result.Items.length < 4 ? 3 : 1,
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
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": item.userId
      }
    };
    promises.push(queryItem(queryParams));
  });

  return Promise.all(promises)
    .then(res => {
      returnObj.Items = res;
      return okResponse("fetched items", returnObj);
    })
    .catch(err => internalServerError(err));
}

async function devFeedPublic(event) {
  console.log("Inside devFeedPublic function", event);

  const { limit, LastEvaluatedKey } = event;
  let returnObj = {};

  const params = {
    TableName: "UsersTable",
    ScanIndexForward: false,
    IndexName: "sortByReputation",
    ProjectionExpression: "userId, reputation",
    KeyConditionExpression: "isDeactivated = :isDeactivated",
    ExpressionAttributeValues: {
      ":isDeactivated": "false"
    }
  };

  if (limit && limit != "false") {
    params.Limit = limit;
  }
  if (LastEvaluatedKey && LastEvaluatedKey != "false") {
    params.ExclusiveStartKey = LastEvaluatedKey;
  }

  const topUsers = await queryItemPaginated(params);
  returnObj.LastEvaluatedKey = topUsers.LastEvaluatedKey
    ? topUsers.LastEvaluatedKey
    : "false";

  const promises = [];

  topUsers.Items.forEach(item => {
    const queryParams = {
      TableName: "PostsTable",
      IndexName: "byUserId",
      ScanIndexForward: false,
      Limit: topUsers.Items.length < 4 ? 3 : 1,
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
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": item.userId
      }
    };
    promises.push(queryItem(queryParams));
  });

  return Promise.all(promises)
    .then(res => {
      returnObj.Items = res;
      return okResponse("fetched items", returnObj);
    })
    .catch(err => internalServerError(err));
}

function tagFeed(event) {
  console.log("Inside tagPost function", event);

  const errors = customValidator(event, ["tagName"]);
  if (errors.length)
    return badRequestResponse("mandatory fields are missing", errors);

  const { tagName, limit, LastEvaluatedKey } = event;

  const params = {
    TableName: "PostsTable",
    IndexName: "byIsDeactivated",
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
    FilterExpression: "contains (tags, :value)",
    KeyConditionExpression: "isDeactivated = :isDeactivated",
    ExpressionAttributeValues: {
      ":value": tagName,
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
    .catch(err => internalServerError(err));
}

async function devPosts(event) {
  console.log("Inside devPosts function", event);

  const errors = customValidator(event, ["userName"]);
  if (errors.length)
    return badRequestResponse("mandatory fields are missing", errors);

  const { userName, limit, LastEvaluatedKey } = event;

  const user = await getUserByUserName({ userName });

  if (!user.data.length)
    return badRequestResponse(`user not fround with the userName ${userName}`);

  const params = {
    TableName: "PostsTable",
    IndexName: "byUserId",
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
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": user.data[0].userId
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
    .catch(err => internalServerError(err));
}

module.exports = {
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
};
