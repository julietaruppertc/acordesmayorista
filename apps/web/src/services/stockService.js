import api from "./api";

export const updateProductStock = async (productId, onHand, expectedVersion) => {
  const response = await api.patch(
    `/api/operator/products/${productId}/stock`,
    {
      onHand,
      expectedVersion,
    }
  );

  return response.data;
};