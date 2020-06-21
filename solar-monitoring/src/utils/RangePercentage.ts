const RangePercentage = (
  input: number,
  range_min: number,
  range_max: number,
  range_2ndMax: number
) => {
  var percentage = ((input - range_min) * 100) / (range_max - range_min);
  if (percentage > 100) {
    if (typeof range_2ndMax !== 'undefined') {
      percentage = ((range_2ndMax - input) * 100) / (range_2ndMax - range_max);
      if (percentage < 0) {
        percentage = 0;
      }
    } else {
      percentage = 100;
    }
  } else if (percentage < 0) {
    percentage = 0;
  }
  return percentage;
};

const RangNumber = (start: number, end: number) => {
  var foo = [];
  for (let i = start; i <= end; i++) foo.push(i);

  return foo;
};

export { RangePercentage, RangNumber };
