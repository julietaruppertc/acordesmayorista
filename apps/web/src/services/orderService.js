
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
