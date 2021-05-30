const { scanItemPaginated } = require("../Utils/DBClient");

const {
  okResponse,
  internalServerError,
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

const {
  containsExpresseionGeneratorForOR
} = require("../Utils/containsExpresseionGeneratorForOR");

const { customValidator } = require("../Utils/customValidator");

async function postSearch(event) {
  console.log("Inside postSearch function", event);

  const errors = customValidator(event, ["searchInput"]);
  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { searchInput, limit, LastEvaluatedKey } = event;

  const searchInputs = searchInput.split(" ");

  const containsArr = [searchInputs.join("-")];

  let i = 0;
  let j = searchInputs.length / 2;

  if (searchInputs.length > 1) {
    while (i <= parseInt(searchInputs.length / 2)) {
      const arr = [...searchInputs];
      containsArr.push(arr.splice(i, j).join("-"));
      i += 1;
      j += 1;
    }
  }

  const containsExpRes = await containsExpresseionGeneratorForOR(
    "hashedUrl",
    containsArr
  );

  const params = {
    TableName: "PostsTable",
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
    FilterExpression: containsExpRes.expression,
    ExpressionAttributeValues: {
      ...containsExpRes.values
    }
  };

  if (limit && limit != "false") {
    params.Limit = limit;
  }
  if (LastEvaluatedKey && LastEvaluatedKey != "false") {
    params.ExclusiveStartKey = LastEvaluatedKey;
  }
  return scanItemPaginated(params)
    .then(result => okResponse("fetched result", result))
    .catch(err => internalServerError(err, "failed to fetch data"));
}

async function devSearch(event) {
  console.log("Inside devSearch function", event);

  const errors = customValidator(event, ["searchInput"]);
  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { searchInput, limit, LastEvaluatedKey } = event;

  const searchInputs = searchInput.split(" ");

  const containsArr = [searchInput];

  let i = 0;
  let j = searchInputs.length / 2;

  if (searchInputs.length > 1) {
    while (i <= parseInt(searchInputs.length / 2)) {
      const arr = [...searchInputs];
      containsArr.push(arr.splice(i, j).join("-"));
      i += 1;
      j += 1;
    }
  }

  const containsExpForName = await containsExpresseionGeneratorForOR(
    "name",
    containsArr
  );

  const containsExpForUserName = await containsExpresseionGeneratorForOR(
    "userName",
    containsArr
  );

  const params = {
    TableName: "UsersTable",
    ProjectionExpression: "#n, userName, profilePicture, reputation",
    ExpressionAttributeNames: {
      "#c": "content",
      "#co": "coverImage",
      "#tg": "tag",
      "#ti": "title",
      "#lk": "like",
      "#rs": "responses"
    },
    FilterExpression:
      containsExpForName.expression +
      " OR " +
      containsExpForUserName.expression,
    ExpressionAttributeValues: {
      ...containsExpForName.values
    }
  };

  if (limit && limit != "false") {
    params.Limit = limit;
  }
  if (LastEvaluatedKey && LastEvaluatedKey != "false") {
    params.ExclusiveStartKey = LastEvaluatedKey;
  }
  return scanItemPaginated(params)
    .then(result => okResponse("fetched result", result))
    .catch(err => internalServerError(err, "failed to fetch data"));
}

module.exports = { postSearch, devSearch };
