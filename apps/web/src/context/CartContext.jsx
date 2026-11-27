
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuthContext } from "./AuthContext";

const CartContext = createContext(null);

const GUEST_CART_KEY = "acordes_cart_guest";

// Obtener el carrito guardado para una cuenta.
const getSavedCart = (storageKey) => {
  try {
    const savedCart = localStorage.getItem(storageKey);
    return savedCart ? JSON.parse(savedCart) : [];
  } catch (error) {
    console.error("No se pudo recuperar el carrito:", error);
    return [];
  }
};

// Obtener stock de un producto.
const getAvailableStock = (product) => {
  return Number(product.availableStock ?? product.stock ?? 0);
};

// Fusionar dos carritos sin duplicar productos.
const mergeCarts = (userCart, guestCart) => {
  const mergedCart = [...userCart];

  guestCart.forEach((guestItem) => {
    const existingProduct = mergedCart.find(
      (item) => item.id === guestItem.id
    );

    if (existingProduct) {
      const stock = getAvailableStock(existingProduct);
      const combinedQuantity =
        existingProduct.quantity + guestItem.quantity;

      mergedCart.splice(
        mergedCart.indexOf(existingProduct),
        1,
        {
          ...existingProduct,
          quantity:
            stock > 0
              ? Math.min(combinedQuantity, stock)
              : combinedQuantity,
        }
      );
    } else {
      const stock = getAvailableStock(guestItem);

      mergedCart.push({
        ...guestItem,
        quantity:
          stock > 0
            ? Math.min(guestItem.quantity, stock)
            : guestItem.quantity,
      });
    }
  });

  return mergedCart;
};

export function CartProvider({ children }) {
  const { user } = useAuthContext();

  // Cada usuario tiene una clave de almacenamiento independiente.
  const storageKey = user?.id
    ? `acordes_cart_user_${user.id}`
    : GUEST_CART_KEY;

  const [cartState, setCartState] = useState(() => ({
    storageKey,
    items: getSavedCart(storageKey),
  }));

  // Recuperar o fusionar el carrito cuando cambia la sesión.
  useEffect(() => {
    if (user?.id) {
      const guestCart = getSavedCart(GUEST_CART_KEY);
      const userCart = getSavedCart(storageKey);

      // Al iniciar sesión, fusionar el carrito de invitado
      // con el carrito personal de la cuenta.
      const mergedCart = mergeCarts(userCart, guestCart);

      try {
        // Guardar primero el carrito fusionado en la cuenta.
        localStorage.setItem(
          storageKey,
          JSON.stringify(mergedCart)
        );

        // Eliminar el carrito de invitado solo después
        // de haber guardado correctamente la fusión.
        if (guestCart.length > 0) {
          localStorage.removeItem(GUEST_CART_KEY);
        }
      } catch (error) {
        console.error(
          "No se pudo fusionar el carrito:",
          error
        );
      }

      setCartState({
        storageKey,
        items: mergedCart,
      });
    } else {
      // Si cierra sesión, recuperar solo el carrito invitado.
      setCartState({
        storageKey,
        items: getSavedCart(storageKey),
      });
    }
  }, [storageKey, user?.id]);

  // Evitar mostrar el carrito de otra cuenta durante el cambio de sesión.
  const cart =
    cartState.storageKey === storageKey
      ? cartState.items
      : [];

  // Guardar únicamente el carrito correspondiente a la cuenta actual.
  useEffect(() => {
    if (cartState.storageKey !== storageKey) return;

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(cartState.items)
      );
    } catch (error) {
      console.error("No se pudo guardar el carrito:", error);
    }
  }, [cartState, storageKey]);

  // Agregar un producto al carrito.
  const addToCart = (product) => {
    const availableStock = getAvailableStock(product);

    if (availableStock <= 0) return;

    setCartState((currentState) => {
      const currentCart =
        currentState.storageKey === storageKey
          ? currentState.items
          : [];

      const existingProduct = currentCart.find(
        (item) => item.id === product.id
      );

      if (existingProduct) {
        if (existingProduct.quantity >= availableStock) {
          return currentState.storageKey === storageKey
            ? currentState
            : { storageKey, items: currentCart };
        }

        return {
          storageKey,
          items: currentCart.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  version: product.version ?? item.version,
                  availableStock,
                  stock: availableStock,
                }
              : item
          ),
        };
      }

      return {
        storageKey,
        items: [
          ...currentCart,
          {
            ...product,
            stock: availableStock,
            availableStock,
            quantity: 1,
          },
        ],
      };
    });
  };

  // Eliminar un producto.
  const removeFromCart = (productId) => {
    setCartState((currentState) => {
      const currentCart =
        currentState.storageKey === storageKey
          ? currentState.items
          : [];

      return {
        storageKey,
        items: currentCart.filter(
          (item) => item.id !== productId
        ),
      };
    });
  };

  // Cambiar la cantidad de un producto.
  const updateQuantity = (productId, quantity) => {
    setCartState((currentState) => {
      const currentCart =
        currentState.storageKey === storageKey
          ? currentState.items
          : [];

      return {
        storageKey,
        items: currentCart.map((item) => {
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
        }),
      };
    });
  };

  // Vaciar el carrito de la cuenta actual.
  const clearCart = () => {
    setCartState({
      storageKey,
      items: [],
    });
  };

  // Total de unidades.
  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Importe total.
  const totalPrice = cart.reduce(
    (total, item) =>
      total + Number(item.price) * item.quantity,
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
