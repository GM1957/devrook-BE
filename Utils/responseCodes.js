const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Origin": "*"
};

const responseMessages = {
  okResponse(message = "success", data = "") {
    return {
      headers,
      status: true,
      statusCode: 200,
      data: data,
      message: message
    };
  },

  internalServerError(error = [], message = "Internal server error") {
    if (error instanceof Array) error.forEach(e => console.error(message, e));
    else console.error(message, error);

    return {
      headers,
      status: false,
      statusCode: 500,
      message: message,
      error
    };
  },

  resourceNotFound(message = "Requested resource not found", data = "") {
    return {
      headers,
      status: false,
      statusCode: 404,
      data: data,
      message: message
    };
  },

  createResponse(message = "Requested data created successfully", data = "") {
    return {
      headers,
      status: true,
      statusCode: 201,
      data: data,
      message: message
    };
  },
  updateResponse(message = "Update successful", data = "") {
    return {
      headers,
      status: true,
      statusCode: 200,
      data: data,
      message: message
    };
  },

  deleteResponse(message = "Deleted successfully", data = "") {
    return {
      headers,
      status: true,
      statusCode: 204,
      data: data,
      message: message
    };
  },

  badRequestResponse(message = "BadRequestResponse", data = "") {
    return {
      headers,
      status: false,
      statusCode: 400,
      data: data,
      message: message
    };
  },

  forbiddenResponse(message = "Access denied", data = "") {
    return {
      headers,
      status: false,
      statusCode: 403,
      data: data,
      message: message
    };
  }
};

module.exports = { responseMessages };
