const uuid = require("uuid");

const { createTag, increaseTagPopularity } = require("../Tags/tags");

const {
  putItem,
  updateItem,
  deleteItem,
  queryItem,
  queryItemPaginated,
} = require("../Utils/DBClient");

const {
  createResponse,
  updateResponse,
  okResponse,
  deleteResponse,
  internalServerError,
  badRequestResponse,
} = require("../Utils/responseCodes").responseMessages;

const { customValidator } = require("../Utils/customValidator");

function createPost(event) {
  console.log("Inside createPost function", event);

  const firstStageErrors = customValidator(event, [
    "userId",
    "postType",
    "title",
    "tags",
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

  titleArr.forEach((ele) => {
    if (ele.length) hashedUrl += ele + "-";
  });

  hashedUrl += uuid.v4().substring(0, 4);

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
      createdAt: new Date(Date.now()).toISOString(),
      isDeactivated: "false",
    },
  };

  return putItem(params)
    .then(async () => {
      try {
        const promises = [];

        tags.forEach((tag) => {
          promises.push(increaseTagPopularity({ tagName: tag }));
          promises.push(createTag({ tagName: tag }));

          const mappingParams = {
            TableName: "TagMappingTable",
            Item: {
              tagName: tag,
              mappedWithId: hashedUrl,
              mappingType: postType,
              createdAt: new Date(Date.now()).toISOString(),
              isDeactivated: "false",
            },
          };
          promises.push(putItem(mappingParams));
        });
        await Promise.all(promises);
      } catch (err) {
        console.log(err);
      }
      return createResponse(`${postType} created successfully`);
    })
    .catch((err) => internalServerError(err, `unable to create ${postType}`));
}

function getAllPosts(event) {
  console.log("Inside getAllPosts function", event);

  const { limit, LastEvaluatedKey, postType } = event;

  const params = {
    TableName: "PostsTable",
    ScanIndexForward: false,
    IndexName: "byPostType",
    KeyConditionExpression: "postType = :postType",
    ExpressionAttributeValues: {
      ":postType": postType,
    },
  };

  if (limit && limit != "false") {
    params.Limit = limit;
  }
  if (LastEvaluatedKey && LastEvaluatedKey != "false") {
    params.ExclusiveStartKey = LastEvaluatedKey;
  }
  return queryItemPaginated(params)
    .then((result) => okResponse("fetched result", result))
    .catch((err) => internalServerError(err, "failed to fetch data"));
}

module.exports = { createPost, getAllPosts };
