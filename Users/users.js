const {
  putItem,
  updateItem,
  deleteItem,
  queryItem,
  queryItemPaginated,
  batchGetItem
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

function updateCognito(event) {
  const { userId, zoneInfo, profile } = event;

  let params = {
    UserAttributes: [],
    UserPoolId: USER_POOL_ID,
    Username: userId
  };

  if (zoneInfo) {
    params["UserAttributes"] = [
      ...params.UserAttributes,
      {
        Name: "zoneinfo",
        Value: zoneInfo
      }
    ];
  }

  if (profile) {
    params["UserAttributes"] = [
      ...params.UserAttributes,
      {
        Name: "profile",
        Value: profile
      }
    ];
  }

  console.log("inside updateCognito function", params);

  return cognitoIdentityService
    .adminUpdateUserAttributes(params)
    .promise()
    .then(result => {
      console.log("cognito result", result);
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
function getUserByUserNamePublicUse(event) {
  console.log("Inside getByUserName Function", event);

  const errors = customValidator(event, ["userName"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userName } = event;

  const params = {
    TableName: "UsersTable",
    IndexName: "byUserName",
    ProjectionExpression:
      "userName, email, #n, #l, bio, profession,  profilePicture, linkedinLink, githubLink, twitterLink, followers, following, reputation, createdAt",
    ExpressionAttributeNames: { "#n": "name", "#l": "location" },
    KeyConditionExpression: "userName = :userName",
    ExpressionAttributeValues: {
      ":userName": userName
    }
  };

  return queryItem(params)
    .then(result => okResponse("fetched result", result))
    .catch(err => internalServerError(err));
}

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
    .then(result => okResponse("fetched result", result))
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
    identities,
    email,
    name,
    userName,
    bio,
    location,
    profession,
    linkedinLink,
    githubLink,
    twitterLink,
    tags
  } = event;

  const userNameValidationResult = await getUserByUserName(event);

  if (userNameValidationResult.data.length)
    return badRequestResponse(
      `an user with userName ${userName} already exist`
    );

  const params = {
    TableName: "UsersTable",
    Item: {
      userId,
      userName: userName.split(" ").join(""),
      email,
      name,
      location: location ? location : "Unknown",
      bio: bio ? bio : "",
      profession: profession ? profession : "",
      profilePicture: "",
      linkedinLink: linkedinLink ? linkedinLink : "",
      githubLink: githubLink ? githubLink : "",
      twitterLink: twitterLink ? twitterLink : "",
      followers: 0,
      following: 0,
      reputation: 10,
      tags: tags ? tags : {},
      createdAt: new Date(Date.now()).toISOString(),
      isDeactivated: "false"
    }
  };

  let cognitoId = userId;

  if (identities) {
    cognitoId = identities.providerName + "_" + identities.userId;
  }

  return putItem(params)
    .then(async () => {
      await updateCognito({
        userId: cognitoId,
        zoneInfo: "1",
        profile: userName
      });

      return createResponse(
        `user created successfully with userId ${userId} and email address ${email}`
      );
    })
    .catch(err =>
      internalServerError(
        err,
        `unable to create user with the email address ${email} and username ${userName}`
      )
    );
}

async function updateUser(event) {
  console.log("Inside updateUser Function", event);

  const errors = customValidator(event, ["userId"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId } = event;

  const user = await getUserByUserId({ userId });

  delete event.userId;
  if (event.email) delete event.email;
  if (event.createdAt) delete event.createdAt;
  if (event.isDeactivated) delete event.isDeactivated;
  if (event.reputation) delete evemt.reputation;
  if (event.followers) delete event.followers;
  if (event.following) delete event.following;
  if (event.tags) delete event.tags;

  if (event.userName) event.userName = event.userName.split(" ").join("");

  const eventArr = Object.keys(event);
  const userArr = Object.keys(user.data[0]);

  eventArr.forEach(item => {
    if (!userArr.includes(item)) delete event[item];
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
    TableName: "UsersTable",
    Key: {
      userId: user.data[0].userId
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: ExpressionAttributeNames,
    ExpressionAttributeValues: ExpressionAttributeValues
  };

  return updateItem(params)
    .then(async () => {
      if (event.userName) {
        await updateCognito({ userId, profile: event.userName });
      }
      return updateResponse(`user updated successfully with userId ${userId}`);
    })
    .catch(err => internalServerError(err, `Error to update the user`));
}

function deleteUser(event) {
  console.log("Inside deleteUser Function", event);

  const errors = customValidator(event, ["userId"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId } = event;

  const userParams = {
    TableName: "UsersTable",
    Key: {
      userId
    }
  };

  return deleteItem(userParams)
    .then(async () => {
      await deleteCognitoUser(userId);
      return deleteResponse(`user deleted successfully with userId ${userId}`);
    })
    .catch(err =>
      internalServerError(
        err,
        `unable to delete the user with userId ${userId}`
      )
    );
}

function topReputedUsers(event) {
  console.log("Inside topReputedUsers function");

  const { limit, LastEvaluatedKey } = event;

  const params = {
    TableName: "UsersTable",
    ScanIndexForward: false,
    IndexName: "sortByReputation",
    ProjectionExpression: "userName, #n,  profilePicture, reputation",
    ExpressionAttributeNames: { "#n": "name" },
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
    .then(result => okResponse("fetched items", result))
    .catch(err => internalServerError(err));
}

async function followUnfollowUser(event) {
  console.log("Inside followUser function", event);

  const errors = customValidator(event, ["followedById", "userName"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userName, followedById } = event;

  const user = await getUserByUserName(event);
  if (!user.data.length)
    return badRequestResponse(`user not found in the db username: ${userName}`);

  const followedByUser = await getUserByUserId({ userId: followedById });
  if (!followedByUser.data.length)
    return badRequestResponse(
      `user not found in the db username: ${followedById}`
    );

  // check already i follow the user or not
  // if i already follow the user simply unfollow the user
  // and if i dont follow the user then follow

  const checkParams = {
    TableName: "FollowUserMappingTable",
    IndexName: "ifIfollow",
    KeyConditionExpression: "followedById = :followedById AND userId = :userId",
    ExpressionAttributeValues: {
      ":followedById": followedById,
      ":userId": user.data[0].userId
    }
  };

  const checkDetails = await queryItem(checkParams);

  if (checkDetails.length) {
    // execute the un follow operation
    const promises = [];

    const mapDeleteParams = {
      TableName: "FollowUserMappingTable",
      Key: {
        userId: checkDetails[0].userId,
        createdAt: checkDetails[0].createdAt
      }
    };

    promises.push(deleteItem(mapDeleteParams));

    const decreaseFollowerParams = {
      TableName: "UsersTable",
      Key: {
        userId: user.data[0].userId
      },
      UpdateExpression: "set reputation = :reputation, followers = :followers",
      ExpressionAttributeValues: {
        ":reputation": user.data[0].reputation - 2,
        ":followers": user.data[0].followers - 1
      }
    };

    promises.push(updateItem(decreaseFollowerParams));

    const decreaseFollowingParams = {
      TableName: "UsersTable",
      Key: {
        userId: followedByUser.data[0].userId
      },
      UpdateExpression: "set following = :following",
      ExpressionAttributeValues: {
        ":following": followedByUser.data[0].following - 1
      }
    };

    promises.push(updateItem(decreaseFollowingParams));

    return Promise.all(promises)
      .then(() => updateResponse("user unFollowed successFully"))
      .catch(err => internalServerError(err));
  } else {
    // execute the follow operation

    const promises = [];

    const mappingParams = {
      TableName: "FollowUserMappingTable",
      Item: {
        userId: user.data[0].userId,
        followedById,
        createdAt: new Date(Date.now()).toISOString(),
        isDeactivated: "false"
      }
    };

    promises.push(putItem(mappingParams));

    const increaseReputationAndFollowerParams = {
      TableName: "UsersTable",
      Key: {
        userId: user.data[0].userId
      },
      UpdateExpression: "set reputation = :reputation, followers = :followers",
      ExpressionAttributeValues: {
        ":reputation": user.data[0].reputation + 2,
        ":followers": user.data[0].followers + 1
      }
    };

    promises.push(updateItem(increaseReputationAndFollowerParams));

    const increaseFollowingParams = {
      TableName: "UsersTable",
      Key: {
        userId: followedByUser.data[0].userId
      },
      UpdateExpression: "set following = :following",
      ExpressionAttributeValues: {
        ":following": followedByUser.data[0].following + 1
      }
    };

    promises.push(updateItem(increaseFollowingParams));

    return Promise.all(promises)
      .then(() => updateResponse("user Followed successFully"))
      .catch(err => internalServerError(err));
  }
}

async function myFollowers(event) {
  console.log("Inside myFollowers function", event);

  const errors = customValidator(event, ["userName"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userName, limit, LastEvaluatedKey } = event;

  const user = await getUserByUserName({ userName });

  if (!user.data.length)
    return badRequestResponse(`user not found ${userName}`);

  const params = {
    TableName: "FollowUserMappingTable",
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

  return queryItemPaginated(params).then(async result => {
    if (result.Items.length) {
      const promises = [];
      result.Items.forEach(userItem => {
        const userQueryParams = {
          TableName: "UsersTable",
          ProjectionExpression: "userName, #n, profilePicture",
          ExpressionAttributeNames: { "#n": "name" },
          KeyConditionExpression: `userId = :userId`,
          ExpressionAttributeValues: {
            ":userId": userItem.followedById
          }
        };

        promises.push(queryItem(userQueryParams));
      });

      const allUsers = await Promise.all(promises);

      result.Items = [...allUsers];

      return okResponse("fetched details", result);
    }
    return okResponse("fetched details", result);
  });
}

async function usersIFollow(event) {
  console.log("Inside usersIFollow function", event);

  const errors = customValidator(event, ["userName"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userName, limit, LastEvaluatedKey } = event;

  const user = await getUserByUserName({ userName });

  if (!user.data.length)
    return badRequestResponse(`user not found ${userName}`);

  const params = {
    TableName: "FollowUserMappingTable",
    ScanIndexForward: false,
    IndexName: "byFollowedById",
    KeyConditionExpression: "followedById = :followedById",
    ExpressionAttributeValues: {
      ":followedById": user.data[0].userId
    }
  };

  if (limit && limit != "false") {
    params.Limit = limit;
  }
  if (LastEvaluatedKey && LastEvaluatedKey != "false") {
    params.ExclusiveStartKey = LastEvaluatedKey;
  }

  return queryItemPaginated(params).then(async result => {
    if (result.Items.length) {
      const promises = [];
      result.Items.forEach(userItem => {
        const userQueryParams = {
          TableName: "UsersTable",
          ProjectionExpression: "userName, #n, profilePicture",
          ExpressionAttributeNames: { "#n": "name" },
          KeyConditionExpression: `userId = :userId`,
          ExpressionAttributeValues: {
            ":userId": userItem.userId
          }
        };

        promises.push(queryItem(userQueryParams));
      });
      const allUsers = await Promise.all(promises);

      result.Items = [...allUsers];

      return okResponse("fetched details", result);
    }
    return okResponse("fetched details", result);
  });
}

async function followUserInBulk(event) {
  console.log("Inside followUserInBulk function", event);

  const errors = customValidator(event, ["followedById", "userNames"]);

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { followedById, userNames } = event;

  if (!userNames.length) return badRequestResponse("no user names selected");

  try {
    for (let i = 0; i < userNames.length; i++) {
      await followUnfollowUser({ followedById, userName: userNames[i] });
    }
    return okResponse("users followed sucessfully");
  } catch (err) {
    return internalServerError(err);
  }
}

function getUserPreviousVotes(event) {
  console.log("Inside getUserPrevVotes", event);

  const errors = customValidator(event, ["voteIds", "userId"]);
  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { voteIds, userId } = event;

  if (!voteIds.length)
    return badRequestResponse("Empty voteIds array", voteIds);

  const keys = [];

  voteIds.forEach(voteId => {
    keys.push({ voteId, userId });
  });

  console.log(keys);

  const batchGetParams = {
    RequestItems: {
      VoteMappingTable: {
        Keys: keys
      }
    }
  };

  return batchGetItem(batchGetParams)
    .then(result =>
      okResponse("previous voting details", result.Responses.VoteMappingTable)
    )
    .catch(err => internalServerError(err));
}

async function ifIfollowChecker(event) {
  console.log("Inside ifIfollowChecker", event);

  const errors = customValidator(event, ["userId", "userName"]);
  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userId, userName } = event;
  const whoIFollow = await getUserByUserName({ userName });

  const params = {
    TableName: "FollowUserMappingTable",
    IndexName: "ifIfollow",
    KeyConditionExpression: "followedById = :followedById AND userId = :userId",
    ExpressionAttributeValues: {
      ":followedById": userId,
      ":userId": whoIFollow.data[0].userId
    }
  };

  return queryItem(params)
    .then(result => {
      if (result.length) {
        delete result[0].userId;
        result[0].userName = userName;
      }
      return okResponse("fetched details", result);
    })
    .catch(err => internalServerError(err));
}

async function increaseUserReputation(event) {
  console.log("Inside increaseUserReputation", event);

  const errors = customValidator(event, ["increaseBy"]);
  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userName, userId, increaseBy } = event;

  let user;

  if (!userName && !userId) return badRequestResponse("user identity missing");

  if (userName) {
    user = await getUserByUserName({ userName });
  } else {
    user = await getUserByUserId({ userId });
  }

  const updateParams = {
    TableName: "UsersTable",
    Key: {
      userId: user.data[0].userId
    },

    UpdateExpression: "set reputation = :reputation",
    ExpressionAttributeValues: {
      ":reputation": parseInt(user.data[0].reputation) + parseInt(increaseBy)
    }
  };
  return updateItem(updateParams)
    .then(() =>
      updateResponse(
        `user: ${userName}'s reputation increased successfully by ${increaseBy}`
      )
    )
    .catch(err => internalServerError(err));
}

async function decreaseUserReputation(event) {
  console.log("Inside decreaseUserReputation", event);

  const errors = customValidator(event, ["decreaseBy"]);
  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  const { userName, userId, decreaseBy } = event;
  let user;

  if (!userName && !userId) return badRequestResponse("user identity missing");

  if (userName) {
    user = await getUserByUserName({ userName });
  } else {
    user = await getUserByUserId({ userId });
  }

  const updateParams = {
    TableName: "UsersTable",
    Key: {
      userId: user.data[0].userId
    },

    UpdateExpression: "set reputation = :reputation",
    ExpressionAttributeValues: {
      ":reputation": parseInt(user.data[0].reputation) - parseInt(decreaseBy)
    }
  };
  return updateItem(updateParams)
    .then(() =>
      updateResponse(
        `user: ${userName}'s reputation decreasedby successfully by ${decreaseBy}`
      )
    )
    .catch(err => internalServerError(err));
}

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  getUserByUserNamePublicUse,
  getUserByUserName,
  getUserByUserId,
  topReputedUsers,
  followUnfollowUser,
  ifIfollowChecker,
  followUserInBulk,
  usersIFollow,
  myFollowers,
  getUserPreviousVotes,
  increaseUserReputation,
  decreaseUserReputation
};
