const { cognitoMessage } = require("./customCognitoMessages.js");
// const { postConfirmation } = require("./postConfirmation.js");
const { userConfirmation } = require("./userConfirmation.js");

function main(event, context, callback) {
  console.log("Input to the CognitoTriggers lambda function: ", event);
  const { eventType } = event;
  const { triggerSource } = event;
  if (
    triggerSource === "CustomMessage_SignUp" ||
    triggerSource === "CustomMessage_ResendCode" ||
    triggerSource === "CustomMessage_ForgotPassword"
  )
    return cognitoMessage(event, context, callback);
  // if (
  //   triggerSource === "PostConfirmation_ConfirmSignUp" ||
  //   triggerSource === "PostConfirmation_ConfirmForgotPassword"
  // )
  //   return postConfirmation(event, context, callback);
  if (eventType === "verification")
    return userConfirmation(event, context, callback);
  return callback(null, event);
}

module.exports = { main };
