import axios from "axios";

const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
export const API_BASE_URL = rawBaseUrl.replace(/\/$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
