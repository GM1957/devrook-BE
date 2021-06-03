const { REDIRECT_API } = process.env;
const {
  ForgotPasswordEmailTemplate,
  SignUpEmailTemplate
} = require("../EmailHandler/emailTemplates.js");

function cognitoMessage(event, context, callback) {
  const name = event.request.usernameParameter || "There";
  const { triggerSource } = event;
  const { codeParameter, linkParameter } = event.request;
  // the following is executed when the user wants to reset his/her password
  if (triggerSource === "CustomMessage_ForgotPassword") {
    const forgotTemplateObj = new ForgotPasswordEmailTemplate({
      name,
      codeParameter
    });
    event.response.smsMessage = forgotTemplateObj.smsMessage;
    event.response.emailSubject = forgotTemplateObj.emailSubject;
    event.response.emailMessage = forgotTemplateObj.htmlContent;
  }
  // the following is executed when a user successfully signsup in DevRook or request for resend verification url
  if (
    triggerSource === "CustomMessage_SignUp" ||
    triggerSource === "CustomMessage_ResendCode"
  ) {
    const { userName, region } = event;
    const { clientId } = event.callerContext;
    const { email } = event.request.userAttributes;
    const verifyUrl = `${REDIRECT_API}/redirect/?code=${codeParameter}&username=${userName}&clientId=${clientId}&region=${region}&email=${email}`;

    const signupTemplateObj = new SignUpEmailTemplate({
      verifyUrl,
      linkParameter
    });
    event.response.smsMessage = signupTemplateObj.smsMessage;
    event.response.emailSubject = signupTemplateObj.subject;
    event.response.emailMessage = signupTemplateObj.htmlContent;
  }
  // Return to Amazon Cognito
  callback(null, event);
}

module.exports = { cognitoMessage };
