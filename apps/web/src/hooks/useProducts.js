
import { useEffect, useState } from "react";
import { getProducts } from "../services/productService";
import { mockProducts } from "../data/mockProducts";

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getProducts();
        const productsFromApi = response;

        if (!Array.isArray(productsFromApi)) {
          throw new Error(
            "La respuesta del catálogo no tiene el formato esperado."
          );
        }

        const adaptedProducts = productsFromApi.map((product) => {
          const availableStock = Number(
            product.availableStock ?? product.stock ?? 0
          );

          return {
            ...product,
            stock: availableStock,
            availableStock,
          };
        });

        setProducts(adaptedProducts);
      } catch (err) {
        console.warn("No se pudo cargar el catálogo del backend:", err);

        setError(
          "No se pudo conectar con el backend. Se muestran productos de prueba."
        );

        setProducts(mockProducts);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  return { products, loading, error };
}
