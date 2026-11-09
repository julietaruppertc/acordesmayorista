
import api from "./api";

export const createOrder = async (cart) => {
  const requestBody = {
    items: cart.map((item) => ({
      productId: item.id,
      quantity: item.quantity,
      expectedVersion: item.version,
    })),
  };

  const response = await api.post("/api/orders/checkout", requestBody);

  return response.data;
};

export const getOrders = async () => (await api.get('/api/orders')).data.data;
export const getOrder = async (id) => (await api.get(`/api/orders/${id}`)).data.data;
export const resolveOrder = async (id, decision) =>
  (await api.post(`/api/orders/${id}/resolve`, { decision })).data.data;
