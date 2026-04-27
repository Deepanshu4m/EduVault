import axios from "axios";

export const axiosInstance = axios.create({});

export const apiConnector = async (
  method,
  url,
  bodyData,
  headers,
  params,
  retries = 2
) => {
  try {
    const response = await axiosInstance({
      method: method,
      url: url,
      data: bodyData || null,
      headers: headers || null,
      params: params || null,
    });

    // 🔥 Handle Render cold start (HTML response)
    if (typeof response?.data === "string") {
      throw new Error("Server waking up...");
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      console.log("Retrying API...", retries);
      await new Promise((res) => setTimeout(res, 3000));
      return apiConnector(method, url, bodyData, headers, params, retries - 1);
    }

    console.error("API ERROR:", error);
    throw error;
  }
};