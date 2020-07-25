export type ChartSeries = {
  x: string | number | Date;
  y: number;
};

export type ChartModel = {
  id: string;
  color: string;
  data: ChartSeries[];
};
