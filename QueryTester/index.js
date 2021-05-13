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
    KeyConditionExpression: "hashedUrl = :hashedUrl AND createdAt = :createdAt",
    ExpressionAttributeValues: {
      ":hashedUrl": "again-blog-78c5d4",
      ":createdAt": "2021-05-09T01:31:35.459Z"
    }
  };
  const res = await queryItem(params);
  console.log(res);
};
