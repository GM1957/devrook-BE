const {
  putItem,
  updateItem,
  deleteItem,
  queryItem,
  queryItemPaginated
} = require("../Utils/DBClient");

exports.main = async event => {
  const params = {
    TableName: "PostsTable",
    IndexName: "byIsDeactivatedAndHashedUrl",
    ScanIndexForward: false,
    KeyConditionExpression:
      "isDeactivated = :isDeactivated AND contains (hashedUrl , :hasVal)",
    ExpressionAttributeValues: {
      ":isDeactivated": "false",
      ":hasVal": "is"
    }
  };
  const res = await queryItem(params);
  console.log(res);
};
