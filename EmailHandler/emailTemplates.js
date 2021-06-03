const { requiredParam } = require("../Utils/validators");

class BaseEmailTemplate {
  constructor({
    subject = requiredParam("subject"),
    htmlContent = requiredParam("htmlContent"),
    smsMessage = requiredParam("smsMessage")
  }) {
    this.subject = subject;
    this.htmlContent = htmlContent;
    this.smsMessage = smsMessage;
  }
}

class SignUpEmailTemplate extends BaseEmailTemplate {
  constructor({
    verifyUrl = requiredParam("verifyUrl"),
    linkParameter = requiredParam("linkParameter")
  }) {
    super({
      subject: "Your confirmation link for signing-up in DevRook",
      smsMessage: "Your confirmation link for signing-up in DevRook",
      htmlContent: `<p>Hi There!</p>
                    <p>We are happy to have you here.</p>
                    <p>Your next step is to confirm your sign-up for DevRook by clicking this <a href="${verifyUrl}" target="_blank">confirmation link</a></p>
                    <p>See you soon in the DevRook portal!</p>
                    <p>Best,<br />Team DevRook</p>
                    <div style="display: none">${linkParameter}</div>`
    });
    this.verifyUrl = verifyUrl;
    this.linkParameter = linkParameter;
  }
}

class ForgotPasswordEmailTemplate extends BaseEmailTemplate {
  constructor({
    name = requiredParam("name"),
    codeParameter = requiredParam("codeParameter")
  }) {
    super({
      subject: "Your verification code to reset password for DevRook",
      smsMessage: `hi ${name} your code for resetting password is ${codeParameter}`,
      htmlContent: `<p>Hi There!</p>
      <p>Here is the verification code for you to reset your password: ${codeParameter}</p>
      <p>You are receiving this email because a request was made to reset the password for your DevRook account.</p>
      <p>If you did not initiate this password reset, please contact us at DevRook.com.</p>
      <p>Best Regards,<br />Team DevRook</p>`
    });
    this.name = name;
    this.codeParameter = codeParameter;
  }
}
class ConfirmForgotPasswordTemplate extends BaseEmailTemplate {
  constructor({ name = requiredParam("name") }) {
    super({
      subject: "[DevRook] Your password was successfully reset",
      smsMessage: `hi ${name} your password has changed`,
      htmlContent: `<p>Hi ${name}</p>
      <p>This is to confirm that you've successfully changed your password for DevRook</p>
      <p>Didn't do this? Be sure to change your password right away!</p>
      <p>Best Regards, <br />DevRook team</p>`
    });
    this.name = name;
  }
}

module.exports = {
  ForgotPasswordEmailTemplate,
  ConfirmForgotPasswordTemplate,
  SignUpEmailTemplate
};
