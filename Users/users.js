const {
  putItem,
  updateItem,
  deleteItem,
  queryItem
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

const { cognitoIdentityService } = require("../Utils/cognitoConnection.js");

const { USER_POOL_ID } = process.env;

function updateCognito(userId) {
  const params = {
    UserAttributes: [
      {
        Name: "profile",
        Value: "1"
      }
    ],
    UserPoolId: USER_POOL_ID,
    Username: userId
  };

  return cognitoIdentityService
    .adminUpdateUserAttributes(params)
    .promise()
    .then(result => {
      console.log("result", result);
      return okResponse("user update sucessfully in cognito", result);
    })
    .catch(err => {
      console.log("error", err);
      return badRequestResponse(
        "unable to update the user in the cognito",
        err
      );
    });
}

function deleteCognitoUser(userId) {
  return cognitoIdentityService
    .adminDeleteUser({
      UserPoolId: USER_POOL_ID,
      Username: userId
    })
    .promise()
    .then(result => {
      console.log("result", result);
      return okResponse("user deleted successfully from the cognito", result);
    })
    .catch(err => {
      console.log("error", err);
      return badRequestResponse("unable to delete cognito user", err);
    });
}

// it will use when user seeing another user profile
function getUserByUserName(event) {
  console.log("Inside getByUserName Function", event);

  const errors = customValidator(event, ["userName"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userName } = event;

  const params = {
    TableName: "UsersTable",
    IndexName: "byUserName",
    KeyConditionExpression: "userName = :userName",
    ExpressionAttributeValues: {
      ":userName": userName
    }
  };

  return queryItem(params)
    .then(result => {
      delete result.userId;
      return okResponse("fetched result", result);
    })
    .catch(err => internalServerError(err));
}

// it will use when user seeing his own profile
function getUserByUserId(event) {
  console.log("Inside getUserByUserId Function", event);

  const errors = customValidator(event, ["userId"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId } = event;

  const params = {
    TableName: "UsersTable",
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId
    }
  };

  return queryItem(params)
    .then(result => okResponse("fetched result", result))
    .catch(err => internalServerError(err));
}

async function createUser(event) {
  console.log("Inside createUser Function", event);

  const errors = customValidator(event, [
    "userId",
    "email",
    "name",
    "userName"
  ]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const {
    userId,
    email,
    name,
    userName,
    bio,
    location,
    profession,
    linkedinLink,
    githubLink,
    twitterLink
  } = event;

  const userNameValidationResult = await getUserByUserName(userName);

  if (userNameValidationResult.data.length)
    return badRequestResponse(
      `an user with userName ${userName} already exist`
    );

  const params = {
    TableName: "UsersTable",
    Item: {
      userId,
      userName,
      email,
      name,
      location: location ? location : "Unknown",
      bio: bio ? bio : "",
      profession: profession ? profession : "",
      linkedinLink: linkedinLink ? linkedinLink : "",
      githubLink: githubLink ? githubLink : "",
      twitterLink: twitterLink ? twitterLink : "",
      createdAt: new Date(Date.now()).toISOString()
    }
  };

  return putItem(params)
    .then(async () => {
      await updateCognito(userId);
      return createResponse(
        `user created successfully with userId ${userId}`,
        params
      );
    })
    .catch(err =>
      internalServerError(
        err,
        `unable to create user with the email address ${email} and username ${userName}`
      )
    );
}

function updateUser(event) {
  console.log("Inside updateUser Function", event);

  const errors = customValidator(event, ["userId"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId } = event;
  delete event.userId;

  if (event.email) delete event.email;
  if (event.userName) delete event.userRole;
  if (event.createdAt) delete event.createdAt;

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
    TableName: "UsersTable",
    Key: {
      userId: userId
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: ExpressionAttributeNames,
    ExpressionAttributeValues: ExpressionAttributeValues
  };

  return updateItem(params)
    .then(() =>
      updateResponse(`user updated successfully with userId ${userId}`, params)
    )
    .catch(err =>
      internalServerError(`Error to update the user ${err}`, params)
    );
}

function deleteUser(event) {
  console.log("Inside deleteUser Function", event);

  const errors = customValidator(event, ["userId"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId } = event;

  const userParams = {
    TableName: "AccountsLedgerTable",
    Key: {
      userId
    }
  };

  return deleteItem(userParams)
    .then(async () => {
      await deleteCognitoUser(event.useId);
      return deleteResponse(
        `user deactivated successfully with userId ${event.userId}`,
        userParams
      );
    })
    .catch(err =>
      internalServerError(`unable to delete the user ${err}`, userParams)
    );
}

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  getUserByUserName,
  getUserByUserId
};
