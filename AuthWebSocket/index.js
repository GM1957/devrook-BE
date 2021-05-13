const jose = require("node-jose");
const fetch = require("node-fetch").default;

const generatePolicy = function(principalId, effect, resource) {
  const authResponse = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument = {};
    // default version
    policyDocument.Version = "2012-10-17";
    policyDocument.Statement = [];
    const statementOne = {};
    // default action
    statementOne.Action = "execute-api:Invoke";
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }
  return authResponse;
};

const generateAllow = function(principalId, resource) {
  return generatePolicy(principalId, "Allow", resource);
};

exports.main = async (event, context) => {
  console.log("inside web socket authorizer", event);
  const methodArn = event.methodArn;
  const token = event.queryStringParameters.Authorizer;

  if (!token) {
    return context.fail("Unauthorized");
  } else {
    // Get the kid from the headers prior to verification
    const sections = token.split(".");
    let header = jose.util.base64url.decode(sections[0]);
    header = JSON.parse(header);
    const kid = header.kid;

    // Fetch known valid keys
    const rawRes = await fetch(process.env.KEYS_URL);
    const response = await rawRes.json();

    if (rawRes.ok) {
      const keys = response["keys"];
      const foundKey = keys.find(key => key.kid === kid);

      if (!foundKey) {
        context.fail("Public key not found in jwks.json");
      } else {
        try {
          const result = await jose.JWK.asKey(foundKey);
          const keyVerify = await jose.JWS.createVerify(result);
          const verificationResult = await keyVerify.verify(token);

          const claims = JSON.parse(verificationResult.payload);
          console.log("claims", claims);

          console.log(
            "process.env.COGNITO_USER_POOL_CLIENT",
            process.env.COGNITO_USER_POOL_CLIENT
          );
          // Verify the token expiration
          const currentTime = Math.floor(new Date() / 1000);
          if (currentTime > claims.exp) {
            console.error("Token expired!");
            context.fail("Token expired!");
          } else if (
            (claims.client_id ? claims.client_id : claims.aud) !==
            process.env.COGNITO_USER_POOL_CLIENT
          ) {
            console.error("Token wasn't issued for target audience");
            context.fail("Token was not issued for target audience");
          } else {
            context.succeed(generateAllow("me", methodArn));
          }
        } catch (error) {
          console.error("Unable to verify token", error);
          context.fail("Signature verification failed");
        }
      }
    }
  }
};
