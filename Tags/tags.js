const {
  putItem,
  updateItem,
  deleteItem,
  queryItem,
  queryItemPaginated
} = require("../Utils/DBClient");

const Tags = require("./allTags.json");

const {
  createResponse,
  updateResponse,
  okResponse,
  deleteResponse,
  internalServerError,
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

const { customValidator } = require("../Utils/customValidator");

function createTag(event) {
  console.log("Inside createTag function", event);
  const errors = customValidator(event, ["tagName"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { tagName, description } = event;

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

  if (userId != "082416af-95ef-4fca-811c-c52d0df9e976")
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

async function increaseTagPopularity(tagName) {
  console.log("Inside increaseTagPopularity function", tagName);

  const tagDetails = await getTag({ tagName });

  if (tagDetails.data.length) {
    const params = {
      TableName: "TagsTable",
      Key: {
        tagName: tagName
      },
      UpdateExpression: "set popularity = :popularity",
      ExpressionAttributeValues: {
        ":popularity": tagDetails.data[0].popularity + 1
      }
    };

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

async function decreaseTagPopularity(tagName) {
  console.log("Inside increaseTagPopularity function", tagName);

  const tagDetails = await getTag({ tagName });

  if (tagDetails.data.length) {
    const params = {
      TableName: "TagsTable",
      Key: {
        tagName: tagName
      },
      UpdateExpression: "set popularity = :popularity",
      ExpressionAttributeValues: {
        ":popularity": tagDetails.data[0].popularity - 1
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

function followTag(event) {
  console.log("Inside followTag function", event);

  const errors = customValidator(event, ["userId", "tagName"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId, tagName } = event;

  const promises = [];

  const mappingParams = {
    TableName: "TagMappingTable",
    Item: {
      tagName,
      mappedWithId: userId,
      mappingType: "User",
      createdAt: new Date(Date.now()).toISOString(),
      isDeactivated: "false"
    }
  };

  promises.push(putItem(mappingParams));
  promises.push(increaseTagPopularity(tagName));

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

  const promises = [];

  const findMapParams = {
    TableName: "TagMappingTable",
    KeyConditionExpression: "userId = :userId And tagName = :tagName",
    ExpressionAttributeValues: {
      ":userId": userId,
      ":tagName": tagName
    }
  };

  const mapDetails = await queryItem(findMapParams);

  if (!mapdetails.length)
    return badRequestResponse(
      `no mapped details found with tag name: ${tagName} and user id : ${userId}`
    );

  const mapDeleteParams = {
    TableName: "TagMappingTable",
    Key: {
      tagName,
      createdAt: mapDetails[0].createdAt
    }
  };
  promises.push(deleteItem(mapDeleteParams));
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

module.exports = {
  createTag,
  getTag,
  increaseTagPopularity,
  decreaseTagPopularity,
  followTag,
  followTagInBulk,
  unFollowTag,
  createDefaultTags,
  getPopularTags
};
