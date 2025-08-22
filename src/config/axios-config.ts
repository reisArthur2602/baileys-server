import axios from "axios";
import http from "http";
import https from "https";
import axiosRetry from "axios-retry";


export const axiosInstance = axios.create({
  timeout: 5000, 
  httpAgent: new http.Agent({ keepAlive: true, maxSockets: 50 }),
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 50 }),
});

axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    error.code === "ECONNABORTED" || error.response?.status! >= 500,
});
