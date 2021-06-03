const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Origin": "*"
};

const responseMessages = {
  okResponse(message = "success", data = "") {
    const theResponse = {
      headers,
      status: true,
      statusCode: 200,
      data: data,
      message: message
    };
    console.log("okResponse", theResponse);
    return theResponse;
  },

  internalServerError(error = [], message = "Internal server error") {
    if (error instanceof Array) error.forEach(e => console.error(message, e));
    else console.error(message, error);

    const theResponse = {
      headers,
      status: false,
      statusCode: 500,
      message: message,
      error
    };
    console.log("internalServerError", theResponse);

    return theResponse;
  },

  resourceNotFound(message = "Requested resource not found", data = "") {
    const theResponse = {
      headers,
      status: false,
      statusCode: 404,
      data: data,
      message: message
    };
    console.log("resourceNotFound", theResponse);

    return theResponse;
  },

  createResponse(message = "Requested data created successfully", data = "") {
    const theResponse = {
      headers,
      status: true,
      statusCode: 201,
      data: data,
      message: message
    };
    console.log("createResponse", theResponse);

    return theResponse;
  },
  updateResponse(message = "Update successful", data = "") {
    const theResponse = {
      headers,
      status: true,
      statusCode: 200,
      data: data,
      message: message
    };
    console.log("updateResponse", theResponse);

    return theResponse;
  },

  deleteResponse(message = "Deleted successfully", data = "") {
    const theResponse = {
      headers,
      status: true,
      statusCode: 204,
      data: data,
      message: message
    };
    console.log("deleteResponse", theResponse);

    return theResponse;
  },

  badRequestResponse(message = "BadRequestResponse", data = "") {
    const theResponse = {
      headers,
      status: false,
      statusCode: 400,
      data: data,
      message: message
    };
    console.log("badRequestResponse", theResponse);

    return theResponse;
  },

  forbiddenResponse(message = "Access denied", data = "") {
    const theResponse = {
      headers,
      status: false,
      statusCode: 403,
      data: data,
      message: message
    };
    console.log("forbiddenResponse", theResponse);

    return theResponse;
  }
};

module.exports = { responseMessages };
