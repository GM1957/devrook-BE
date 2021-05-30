function beginsWithExpresseionGeneratorForOR(columnName, valuesArr) {
  result = {};
  values = {};
  expression = "";

  valuesArr.forEach((value, i) => {
    const ranVal = ":val" + i.toString();
    expression += " begins_with (" + columnName + ", " + ranVal + ")" + " OR";
    values[ranVal] = value;
  });

  // removing last OR

  expression = expression.slice(0, -2);

  result.expression = expression;
  result.values = values;

  return result;
}

module.exports = { beginsWithExpresseionGeneratorForOR };
