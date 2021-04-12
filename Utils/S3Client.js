const AWS = require("aws-sdk");
const region = process.env.REGION;
AWS.config.update({ region });
const s3 = new AWS.S3();

function s3getItem(params) {
  return new Promise((resolve, reject) =>
    s3.getObject(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    })
  );
}

function s3putItem(params) {
  return new Promise((resolve, reject) =>
    s3.putObject(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    })
  );
}

function s3deleteItem(params) {
  return new Promise((resolve, reject) =>
    s3.deleteObject(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    })
  );
}
module.exports = { s3getItem, s3putItem, s3deleteItem };
