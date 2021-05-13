const {
  connectHandler,
  defaultHandler,
  disconnectHandler,
  messageHandler
} = require("./webSockets");
const {
  badRequestResponse
} = require("../Utils/responseCodes").responseMessages;

exports.main = event => {
  console.log("Input to the WebSocket Lambda", event);

  const { routeKey, eventType } = event.requestContext;

  if (routeKey === "$connect") return connectHandler(event);
  if (routeKey === "$disconnect") return disconnectHandler(event);
  if (routeKey === "$default") {
    if (eventType === "MESSAGE") return messageHandler(event);
    return defaultHandler(event);
  }

  return badRequestResponse("no route found");
};
