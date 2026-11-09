

import api from "./api";

export const getProducts = async () => {
  const response = await api.get("/api/products");

  // El backend devuelve { data, pagination, traceId }
  return response.data.data;
};
