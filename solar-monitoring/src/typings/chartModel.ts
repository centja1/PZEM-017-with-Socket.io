export type ChartSeries = {
  x: string;
  y: number;
};

export type ChartModel = {
  id: string;
  color: string;
  data: ChartSeries[];
};
