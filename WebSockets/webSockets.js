const WebSocket = require("../Utils/websocketMessage");

const { getUserByUserName } = require("../Users/users");
const { customValidator } = require("../Utils/customValidator");

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

async function connectHandler(event) {
  console.log("Inside connect Handler", event);

  const { connectionId, domainName, stage, authorizer } = event.requestContext;

  const params = {
    TableName: "WebSocketUserTable",
    Item: {
      connectionId,
      createdAt: new Date(Date.now()).toISOString(),
      domainName,
      stage,
      userId: authorizer.sub
    }
  };

  return putItem(params)
    .then(() => {
      // cannot use okResponse here tried every way
      return {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Methods": "*",
          "Access-Control-Allow-Origin": "*"
        },
        statusCode: 200,
        body: JSON.stringify({ message: "connected" })
      };
    })
    .catch(err => internalServerError(err));
}

function disconnectHandler(event) {
  console.log("Inside disconnectHandler Handler", event);

  const { connectionId } = event.requestContext;

  const params = {
    TableName: "WebSocketUserTable",
    Key: {
      connectionId
    }
  };

  return deleteItem(params)
    .then(() => deleteResponse("disconnected"))
    .catch(err => internalServerError(err));
}

async function messageHandler(event) {
  console.log("Inside messageHandler Handler", event);

  const { connectionId: senderConnectionId } = event.requestContext;
  const body = JSON.parse(event.body);

  const errors = customValidator(body, ["message", "receiverUserName"]);
  if (!senderConnectionId) errors.push("senderConnectionId");

  if (errors.length)
    return badRequestResponse("missing mandetory fields", errors);

  try {
    const { message, receiverUserName } = body;

    if (message.length < 1)
      return badRequestResponse("cannot accept empty message string");

    // we need recivers connection id first
    const receiverDetails = await getUserByUserName({
      userName: receiverUserName
    });
    console.log("receiverDetails", receiverDetails);
    const receiverId = receiverDetails.data[0].userId;

    // query the webSocketUserTable with receiverId, to find receiverConnectionId
    const getReceiverConnectionParams = {
      TableName: "WebSocketUserTable",
      IndexName: "byUserId",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": receiverId
      }
    };

    const getSenderConnectionParams = {
      TableName: "WebSocketUserTable",
      KeyConditionExpression: "connectionId = :connectionId",
      ExpressionAttributeValues: {
        ":connectionId": senderConnectionId
      }
    };

    const senderConnectionRecord = await queryItem(getSenderConnectionParams);
    console.log("senderConnectionRecord", senderConnectionRecord);

    const senderId = senderConnectionRecord[0].userId;

    const receiverConnectionRecord = await queryItem(
      getReceiverConnectionParams
    );

    console.log("receiverConnectionRecord", receiverConnectionRecord);

    // if the receiver is online
    if (receiverConnectionRecord.length) {
      const {
        domainName: receiverDomainName,
        stage: receiverStage,
        connectionId: receiverConnectionId
      } = receiverConnectionRecord[0];

      const socketReceiverSendParams = {
        domainName: receiverDomainName,
        stage: receiverStage,
        connectionId: receiverConnectionId,
        message
      };
      //sending the message to the receiver user from websocket as first priority
      await WebSocket.send(socketReceiverSendParams);
    }

    // by default sending the data to the sender connection
    const {
      domainName: senderDomainName,
      stage: senderStage
    } = senderConnectionRecord[0];

    const socketSenderSendParams = {
      domainName: senderDomainName,
      stage: senderStage,
      connectionId: senderConnectionId,
      message: "" // using this message length as a flag, if empty string received that means this message was send by the senders side
    };
    //sending the message to the to the sender as cofirmation
    await WebSocket.send(socketSenderSendParams);

    const messagePutParams = {
      TableName: "MessageTable",
      Item: {
        message,
        senderId,
        receiverId,
        createdAt: new Date(Date.now()).toISOString()
      }
    };

    // this flag is to check who startd the conversation it will help to find the users with whom you had conversation started
    // do a query in MessageFlagTable two times with senderId and receiverId marge the two result and you will get all conversations with combId you had
    const messageFlagPutParams = {
      TableName: "MessageFlagTable",
      Item: {
        senderId,
        receiverId,
        createdAt: new Date(Date.now()).toISOString()
      }
    };

    //first i will search message mapping table if the (senderId*receiverId)
    const flagFindParams = {
      TableName: "MessageFlagTable",
      KeyConditionExpression: "combId = :combId",
      ExpressionAttributeValues: {
        ":combId": senderId + "*" + receiverId
      }
    };

    const promises = [];

    const senderFlagDetails = await queryItem(flagFindParams);

    if (!senderFlagDetails.length) {
      flagFindParams.ExpressionAttributeValues = {
        ":combId": receiverId + "*" + senderId
      };

      const recieverFlagDetails = await queryItem(flagFindParams);

      // if current sender was not initiated the conversation then i am checking receiver was initiated or not
      if (recieverFlagDetails.length) {
        messageFlagPutParams.Item.combId = receiverId + "*" + senderId;
        messagePutParams.Item.combId = receiverId + "*" + senderId;

        promises.push(putItem(messageFlagPutParams), putItem(messagePutParams));
      } else {
        messageFlagPutParams.Item.combId = senderId + "*" + receiverId;
        messagePutParams.Item.combId = senderId + "*" + receiverId;

        promises.push(putItem(messageFlagPutParams), putItem(messagePutParams));
      }
    } else {
      messageFlagPutParams.Item.combId = senderId + "*" + receiverId;
      messagePutParams.Item.combId = senderId + "*" + receiverId;

      promises.push(putItem(messageFlagPutParams), putItem(messagePutParams));
    }

    await Promise.all(promises);

    // cannot use okResponse here tried every way
    return {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Origin": "*"
      },
      statusCode: 200,
      body: JSON.stringify({ message: "got message" })
    };
  } catch (err) {
    return internalServerError(err, "unable to get message");
  }
}

function defaultHandler(event) {
  console.log("Inside defaultHandler Handler", event);

  return okResponse("default");
}

module.exports = {
  connectHandler,
  defaultHandler,
  disconnectHandler,
  messageHandler
};
