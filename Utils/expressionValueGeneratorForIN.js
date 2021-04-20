function expressionValueGeneratorFornIN(items) {
  console.log("inside expressionValueGenerator function", items);
  let result = {};
  let expressions = "";
  let index = 0;
  let ExpressionAttributeValues = {};

  items.forEach(item => {
    index += 1;
    let id = ":" + "id" + `${index}`;
    ExpressionAttributeValues[id] = item;
    id = id + " ,";
    expressions = expressions + id;
  });
  // removing last comma
  expressions = expressions.slice(0, -1);

  result.expressions = expressions;
  result.ExpressionAttributeValues = ExpressionAttributeValues;

  return result;
}

module.exports = { expressionValueGeneratorFornIN };
