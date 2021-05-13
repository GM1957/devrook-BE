const WebSocket = require("../Utils/websocketMessage");

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

  const { connectionId, domainName, stage } = event.requestContext;

  const params = {
    TableName: "WebSocketUserTable",
    Item: {
      connectionId,
      createdAt: new Date(Date.now()).toISOString(),
      messages: [],
      domainName,
      stage
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

  try {
    const { connectionId } = event.requestContext;
    const body = JSON.parse(event.body);

    const getParams = {
      TableName: "WebSocketUserTable",
      KeyConditionExpression: "connectionId = :connectionId",
      ExpressionAttributeValues: {
        ":connectionId": connectionId
      }
    };

    console.log("get Params", getParams);

    const record = await queryItem(getParams);

    console.log("record", record);

    const { messages, domainName, stage } = record[0];

    messages.push(body.message);

    const data = {
      ...record[0],
      messages
    };

    const params = {
      TableName: "WebSocketUserTable",
      Item: data
    };
    console.log("params", params);
    await putItem(params);

    await WebSocket.send({
      domainName,
      stage,
      connectionId,
      message: "This is a reply to your message"
    });
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
