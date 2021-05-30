const {
  queryItem,
  batchGetItem,
  queryItemPaginated
} = require("../Utils/DBClient");

const {
  okResponse,
  internalServerError,
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

const { getUserByUserName } = require("../Users/users");

const { customValidator } = require("../Utils/customValidator");

async function chattedWithIds(event) {
  console.log("Inside chattedWithIds function", event);

  const errors = customValidator(event, ["userId"]);
  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId } = event;

  const promises = [];

  const senderConvIdsParams = {
    TableName: "MessageFlagTable",
    ScanIndexForward: false,
    IndexName: "bySenderId",
    KeyConditionExpression: "senderId = :senderId",
    ExpressionAttributeValues: {
      ":senderId": userId
    }
  };

  promises.push(queryItem(senderConvIdsParams));

  const receiverConvIdsParams = {
    TableName: "MessageFlagTable",
    ScanIndexForward: false,
    IndexName: "byReceiverId",
    KeyConditionExpression: "receiverId = :receiverId",
    ExpressionAttributeValues: {
      ":receiverId": userId
    }
  };

  promises.push(queryItem(receiverConvIdsParams));

  const flagResult = await Promise.all(promises);

  //i was the first sender
  const firstSortedArr = flagResult[0];

  // i was the first reciever
  const secondSortedArr = flagResult[1];

  // marging two arrays in time sorted order with greedy approach

  let keys = [];
  let index1 = 0;
  let index2 = 0;
  let current = 0;

  while (current < firstSortedArr.length + secondSortedArr.length) {
    let isFirstArrEnded = index1 >= firstSortedArr.length;
    let secondArrEnded = index2 >= secondSortedArr.length;

    // if first array is not ended AND either second array is ended or first array element id greater than second array element
    if (
      !isFirstArrEnded &&
      (secondArrEnded ||
        (firstSortedArr[index1] ? firstSortedArr[index1] : false) >
          (secondSortedArr[index2] ? secondSortedArr[index2] : false))
    ) {
      keys[current] = { userId: firstSortedArr[index1].receiverId };
      index1++;
    } else {
      keys[current] = { userId: secondSortedArr[index2].senderId };
      index2++;
    }
    current++;
  }

  const params = {
    RequestItems: {
      UsersTable: {
        Keys: keys,
        ExpressionAttributeNames: { "#n": "name" },
        ProjectionExpression: "userName, profilePicture, #n"
      }
    }
  };

  return batchGetItem(params)
    .then(result => okResponse("fetched items", result.Responses.UsersTable))
    .catch(err => internalServerError(err));
}

async function fullChat(event) {
  console.log("Inside fullChat function", event);

  const errors = customValidator(event, ["userId", "userName"]);
  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId, userName, limit, LastEvaluatedKey } = event;

  const secondUser = await getUserByUserName({ userName: userName });

  const secondUserId = secondUser.data[0].userId;

  const firstComb = userId + "*" + secondUserId;
  const secondComb = secondUserId + "*" + userId;

  const firstCombParams = {
    TableName: "MessageTable",
    ScanIndexForward: false,
    KeyConditionExpression: "combId = :combId",
    ProjectionExpression: "#m, senderId, receiverId, createdAt",
    ExpressionAttributeNames: { "#m": "message" },
    ExpressionAttributeValues: {
      ":combId": firstComb
    }
  };

  if (limit && limit != "false") {
    firstCombParams.Limit = limit;
  }
  if (LastEvaluatedKey && LastEvaluatedKey != "false") {
    firstCombParams.ExclusiveStartKey = LastEvaluatedKey;
  }

  return queryItemPaginated(firstCombParams).then(async response => {
    if (!response.Items.length) {
      const secondCombParams = {
        TableName: "MessageTable",
        ScanIndexForward: false,
        KeyConditionExpression: "combId = :combId",
        ProjectionExpression: "#m, senderId, receiverId, createdAt",
        ExpressionAttributeNames: { "#m": "message" },
        ExpressionAttributeValues: {
          ":combId": secondComb
        }
      };

      if (limit && limit != "false") {
        secondCombParams.Limit = limit;
      }
      if (LastEvaluatedKey && LastEvaluatedKey != "false") {
        secondCombParams.ExclusiveStartKey = LastEvaluatedKey;
      }

      const newResponse = await queryItemPaginated(secondCombParams);
      newResponse.Items.forEach(item =>
        item.senderId === userId ? delete item.receiverId : delete item.senderId
      );
      return okResponse("fetched data", newResponse);
    }
    response.Items.forEach(item =>
      item.senderId === userId ? delete item.receiverId : delete item.senderId
    );
    return okResponse("fetched data", response);
  });
}

module.exports = { chattedWithIds, fullChat };
