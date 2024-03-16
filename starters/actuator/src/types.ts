import Prometheus from "prom-client";

export type MetricsContext = {
    register: Prometheus.Registry;
    http_request_counter: Prometheus.Counter;
    http_request_duration_milliseconds: Prometheus.Histogram;
};
