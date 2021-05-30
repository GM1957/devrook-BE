const {
  putItem,
  updateItem,
  deleteItem,
  queryItem,
  queryItemPaginated
} = require("../Utils/DBClient");

const Tags = require("./allTags.json");

const { getUserByUserId } = require("../Users/users");

const {
  createResponse,
  updateResponse,
  okResponse,
  deleteResponse,
  internalServerError,
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

const { customValidator } = require("../Utils/customValidator");

async function createTag(event) {
  console.log("Inside createTag function", event);
  const errors = customValidator(event, ["tagName"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { tagName, description } = event;

  const tagCheck = await getTag({ tagName });

  console.log("tagcheck", tagCheck);

  if (tagCheck.data.length)
    return badRequestResponse(`tag already exists tagName: ${tagName}`);

  const params = {
    TableName: "TagsTable",
    Item: {
      tagName,
      description: description ? description : "",
      popularity: 1,
      isDeactivated: "false",
      createdAt: new Date(Date.now()).toISOString()
    }
  };

  return putItem(params)
    .then(() => {
      return createResponse(
        `tag created successfully with the name of ${tagName}`
      );
    })
    .catch(err =>
      internalServerError(
        err,
        `unable to create tag with the tag name of ${tagName}`
      )
    );
}

function createDefaultTags(event) {
  console.log("Inside createDefaultTags function", event);

  const errors = customValidator(event, ["userId"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);
  const promises = [];

  const { userId } = event;

  if (userId != "0407cd68-c8fb-41f9-9115-f05a2e3bb3c6")
    return badRequestResponse("you are not an admin");

  Tags.forEach(tag => {
    promises.push(
      createTag({ tagName: tag.tagName, description: tag.description })
    );
  });

  return Promise.all(promises)
    .then(() => okResponse("default tags set successfully"))
    .catch(err => internalServerError(err, "failed to set defaul tags"));
}

function getTag(event) {
  console.log("Inside getTag function", event);
  const errors = customValidator(event, ["tagName"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { tagName } = event;

  const params = {
    TableName: "TagsTable",
    KeyConditionExpression: "tagName = :tagName",
    ExpressionAttributeValues: {
      ":tagName": tagName
    }
  };

  return queryItem(params)
    .then(result => okResponse("fetched result", result))
    .catch(err => internalServerError(err));
}

function getPopularTags(event) {
  console.log("Inside getPopularTags function");

  const { limit, LastEvaluatedKey } = event;

  const params = {
    TableName: "TagsTable",
    ScanIndexForward: false,
    IndexName: "sortByPopularity",
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

  return queryItemPaginated(params)
    .then(result => okResponse("fetched result", result))
    .catch(err => internalServerError(err, "failed to fetch data"));
}

async function increaseTagPopularity(event) {
  console.log("Inside increaseTagPopularity function", event);
  const { tagName } = event;
  const tagDetails = await getTag({ tagName });

  console.log("tagDetails from increase popularity", tagDetails);

  if (tagDetails.data.length) {
    const params = {
      TableName: "TagsTable",
      Key: {
        tagName: tagDetails.data[0].tagName,
        createdAt: tagDetails.data[0].createdAt
      },
      UpdateExpression: "set popularity = :popularity",
      ExpressionAttributeValues: {
        ":popularity": parseInt(tagDetails.data[0].popularity) + 1
      }
    };

    console.log("update params for increase tag populatiry", params);

    return updateItem(params)
      .then(() => updateResponse(`tag popularity increased by 1 ${tagName}`))
      .catch(err =>
        internalServerError(
          err,
          `unable to increase the populariry of ${tagName} tag`
        )
      );
  }
}

async function decreaseTagPopularity(event) {
  console.log("Inside increaseTagPopularity function", event);
  const { tagName } = event;

  const tagDetails = await getTag({ tagName });

  if (tagDetails.data.length) {
    const params = {
      TableName: "TagsTable",
      Key: {
        tagName: tagDetails.data[0].tagName,
        createdAt: tagDetails.data[0].createdAt
      },
      UpdateExpression: "set popularity = :popularity",
      ExpressionAttributeValues: {
        ":popularity": parseInt(tagDetails.data[0].popularity) - 1
      }
    };

    return updateItem(params)
      .then(() => updateResponse(`tag popularity decreased by 1 ${tagName}`))
      .catch(err =>
        internalServerError(
          err,
          `unable to decrease the populariry of ${tagName} tag`
        )
      );
  }
}

async function followTag(event) {
  console.log("Inside followTag function", event);

  const errors = customValidator(event, ["userId", "tagName"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId, tagName } = event;

  const user = await getUserByUserId({ userId });

  const promises = [];

  let updatedTags = { ...user.data[0].tags };

  updatedTags[tagName] = "1";

  const followTagParams = {
    TableName: "UsersTable",
    Key: {
      userId: user.data[0].userId
    },
    UpdateExpression: "set tags = :tags",
    ExpressionAttributeValues: { ":tags": updatedTags }
  };

  promises.push(updateItem(followTagParams));

  promises.push(increaseTagPopularity({ tagName }));

  return Promise.all(promises)
    .then(() => {
      return createResponse(`tag followed succesfully : ${tagName}`);
    })
    .catch(err =>
      internalServerError(err, `unable to follow the tag : ${tagName}`)
    );
}

async function unFollowTag(event) {
  console.log("Inside unFollowTag function", event);

  const errors = customValidator(event, ["userId", "tagName"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId, tagName } = event;

  const user = await getUserByUserId({ userId });

  const promises = [];

  let updatedTags = { ...user.data[0].tags };

  if (!updatedTags[tagName])
    return badRequestResponse(
      `no tag name was followed tag-name: ${tagName} and user-id : ${userId}`
    );

  delete updatedTags[tagName];

  const unFollowTagParams = {
    TableName: "UsersTable",
    Key: {
      userId: user.data[0].userId
    },
    UpdateExpression: "set tags = :tags",
    ExpressionAttributeValues: { ":tags": updatedTags }
  };

  promises.push(updateItem(unFollowTagParams));

  promises.push(decreaseTagPopularity({ tagName }));

  return Promise.all(promises)
    .then(() => {
      return createResponse(`tag unfollowed succesfully : ${tagName}`);
    })
    .catch(err =>
      internalServerError(err, `unable to unfollow the tag : ${tagName}`)
    );
}

async function followTagInBulk(event) {
  console.log("Inside followTagInBulk function", event);

  const errors = customValidator(event, ["userId", "tagNames"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId, tagNames } = event;

  if (!tagNames.length) return badRequestResponse("no tags selected");

  const promises = [];

  tagNames.forEach(tagName => {
    promises.push(followTag({ userId, tagName }));
  });

  return Promise.all(promises)
    .then(() => okResponse("tags followed successfully"))
    .catch(err => internalServerError(err));
}

async function devsWhoFollowTheTag(event) {
  console.log("Inside devsWhoFollowTheTag function", event);

  const errors = customValidator(event, ["tagName"]);
  if (errors.length)
    return badRequestResponse("missing mandatory fields", errors);

  const { tagName, limit, LastEvaluatedKey } = event;

  const tagDetails = await getTag({ tagName });
  if (!tagDetails.data.length)
    return badRequestResponse(`tag not found ${tagName}`);
  if (tagDetails.data[0].popularity < 1)
    return okResponse("fetched details", []);

  const params = {
    TableName: "UsersTable",
    IndexName: "sortByReputation",
    ScanIndexForward: false,
    KeyConditionExpression: "isDeactivated = :isDeactivated",
    FilterExpression: "tags.#tagName = :val",
    ProjectionExpression: "userName, #n,  profilePicture, reputation",
    ExpressionAttributeValues: { ":val": "1", ":isDeactivated": "false" },
    ExpressionAttributeNames: {
      "#tagName": tagName,
      "#n": "name"
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
  createTag,
  getTag,
  increaseTagPopularity,
  decreaseTagPopularity,
  followTag,
  followTagInBulk,
  unFollowTag,
  createDefaultTags,
  getPopularTags,
  devsWhoFollowTheTag
};
