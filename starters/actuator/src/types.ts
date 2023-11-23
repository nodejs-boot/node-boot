import Prometheus from "prom-client";
import v8 from "v8";

export type Info = {
  nodeVersion: string;
  uptime: number;
  loadAvg: number[];
  host: string;
  build?: any;
  git?: any;
};

export type MemoryInfo = {
  memoryUsage: any;
  totalMem: number;
  freeMem: number;
  heap: v8.HeapInfo;
  heapSpace: v8.HeapSpaceInfo[];
  heapCodeStatistics: v8.HeapCodeStatistics;
};

export type MetricsContext = {
  register: Prometheus.Registry;
  http_request_counter: Prometheus.Counter;
  http_request_duration_milliseconds: Prometheus.Histogram;
};
