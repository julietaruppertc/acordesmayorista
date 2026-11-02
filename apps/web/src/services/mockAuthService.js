
const MOCK_USERS_KEY = "mockUsers";

const initialUsers = [
  {
    id: "demo-cliente",
    email: "cliente@acordes.com",
    password: "123456",
    rol: "cliente",
    estado_mayorista: null,
  },
  {
    id: "demo-mayorista",
    email: "mayorista@acordes.com",
    password: "123456",
    rol: "cliente",
    cuit: "20123456789",
    estado_mayorista: "APROBADO",
  },
  {
    id: "demo-operador",
    email: "operador@acordes.com",
    password: "123456",
    rol: "operador",
    estado_mayorista: null,
  },
];

const getUsers = () => {
  const savedUsers = localStorage.getItem(MOCK_USERS_KEY);

  if (savedUsers) {
    return JSON.parse(savedUsers);
  }

  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(initialUsers));
  return initialUsers;
};

const saveUsers = (users) => {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
};

// Iniciar sesión
export const mockLoginUser = async ({ email, password }) => {
  const users = getUsers();

  const user = users.find(
    (item) =>
      item.email.toLowerCase() === email.toLowerCase() &&
      item.password === password
  );

  if (!user) {
    throw new Error("Correo electrónico o contraseña incorrectos.");
  }

  const { password: ignoredPassword, ...safeUser } = user;

  const token = `demo-token-${user.id}`;

  sessionStorage.setItem("token", token);
  sessionStorage.setItem("user", JSON.stringify(safeUser));

  return safeUser;
};

// Registrar usuario
export const mockRegisterUser = async (userData) => {
  const users = getUsers();

  const emailExists = users.some(
    (user) =>
      user.email.toLowerCase() === userData.email.toLowerCase()
  );

  if (emailExists) {
    throw new Error("Ya existe una cuenta con ese correo electrónico.");
  }

  const newUser = {
    id: `demo-${Date.now()}`,
    email: userData.email,
    password: userData.password,
    rol: userData.rol || "cliente",
    cuit: userData.cuit || null,
    estado_mayorista: userData.cuit ? "PENDIENTE" : null,
  };

  saveUsers([...users, newUser]);

  return {
    message: "Cuenta creada correctamente.",
    user: {
      id: newUser.id,
      email: newUser.email,
      rol: newUser.rol,
      estado_mayorista: newUser.estado_mayorista,
    },
  };
};

// Obtener solicitudes mayoristas
export const mockGetWholesaleRequests = async () => {
  const users = getUsers();

  return users
    .filter((user) => user.cuit)
    .map(({ password, ...safeUser }) => safeUser);
};

// Aprobar o rechazar una solicitud
export const mockUpdateWholesaleStatus = async (userId, estado) => {
  if (!["APROBADO", "RECHAZADO"].includes(estado)) {
    throw new Error("El estado solicitado no es válido.");
  }

  const users = getUsers();

  const userIndex = users.findIndex(
    (user) => user.id === userId
  );

  if (userIndex === -1) {
    throw new Error("No se encontró el usuario.");
  }

  if (!users[userIndex].cuit) {
    throw new Error("El usuario no tiene una solicitud mayorista.");
  }

  const updatedUsers = [...users];

  updatedUsers[userIndex] = {
    ...updatedUsers[userIndex],
    estado_mayorista: estado,
  };

  saveUsers(updatedUsers);

  const { password, ...safeUser } = updatedUsers[userIndex];

  return safeUser;
};

// Cerrar sesión
export const mockLogoutUser = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
};
