
import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  // Recuperar el carrito guardado al iniciar la aplicación.
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem("acordes_cart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error("No se pudo recuperar el carrito:", error);
      return [];
    }
  });

  // Guardar automáticamente cada modificación del carrito.
  useEffect(() => {
    localStorage.setItem("acordes_cart", JSON.stringify(cart));
  }, [cart]);

  // Obtener el stock disponible.
  const getAvailableStock = (product) => {
    return Number(product.availableStock ?? product.stock ?? 0);
  };

  // Agregar un producto al carrito.
  const addToCart = (product) => {
    const availableStock = getAvailableStock(product);

    if (availableStock <= 0) return;

    setCart((currentCart) => {
      const existingProduct = currentCart.find(
        (item) => item.id === product.id
      );

      if (existingProduct) {
        if (existingProduct.quantity >= availableStock) {
          return currentCart;
        }

        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                version: product.version ?? item.version,
                availableStock,
                stock: availableStock,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          stock: availableStock,
          availableStock,
          quantity: 1,
        },
      ];
    });
  };

  // Eliminar un producto.
  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId)
    );
  };

  // Cambiar la cantidad de un producto.
  const updateQuantity = (productId, quantity) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) return item;

        const availableStock = getAvailableStock(item);

        const newQuantity = Math.max(
          1,
          Math.min(Number(quantity) || 1, availableStock)
        );

        return {
          ...item,
          quantity: newQuantity,
        };
      })
    );
  };

  // Vaciar el carrito.
  const clearCart = () => setCart([]);

  // Total de unidades.
  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Importe total.
  const totalPrice = cart.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
