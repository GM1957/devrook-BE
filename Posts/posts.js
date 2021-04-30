const uuid = require("uuid");

const { createTag, increaseTagPopularity } = require("../Tags/tags");

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

  const titleArr = title.split(" ");

  let hashedUrl = "";

  titleArr.forEach(ele => {
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
      isDeactivated: "false"
    }
  };

  return putItem(params)
    .then(async () => {
      try {
        const promises = [];

        for (let i = 0; i < tags.length; i++) {
          try {
            const response = await createTag({ tagName: tags[i] });
            console.log("response from posts", response);
          } catch (err) {
            console.error(err);
          }
          promises.push(increaseTagPopularity({ tagName: tags[i] }));

          const mappingParams = {
            TableName: "TagMappingTable",
            Item: {
              tagName: tags[i],
              mappedWithId: hashedUrl,
              mappingType: "question",
              createdAt: new Date(Date.now()).toISOString(),
              isDeactivated: "false"
            }
          };
          promises.push(putItem(mappingParams));
        }
        await Promise.all(promises);
      } catch (err) {
        console.log(err);
      }
      return createResponse(`${postType} created successfully`);
    })
    .catch(err => internalServerError(err, `unable to create ${postType}`));
}

module.exports = { createPost };
