const ReduceMessage = (limit: number, logs: any[], reverse = false) => {
  var totalRows = 0;
  logs.forEach((a: any, i: number) => {
    if (totalRows >= limit) logs.splice(i, 1);
    totalRows++;
  });
};

const ReduceData = (limit: number, logs: any[]) => {
  var totalRows = 0;
  logs.forEach((a: any, i: number) => {
    if (totalRows >= limit) logs.shift();
    totalRows++;
  });
};

export { ReduceData, ReduceMessage };
