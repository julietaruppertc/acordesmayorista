
const MOCK_USERS_KEY = "mockUsers";

const initialUsers = [
  {
    id: "demo-cliente",
    email: "cliente@acordes.com",
    password: "123456",
    rol: "cliente",
    cuit: null,
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
    cuit: null,
    estado_mayorista: null,
  },
];

// Obtener usuarios guardados
const getUsers = () => {
  const savedUsers = localStorage.getItem(MOCK_USERS_KEY);

  if (savedUsers) {
    return JSON.parse(savedUsers);
  }

  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(initialUsers));
  return initialUsers;
};

// Guardar usuarios
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

  const email = userData.email?.trim().toLowerCase();

  if (!email || !userData.password) {
    throw new Error("El correo y la contraseña son obligatorios.");
  }

  const emailExists = users.some(
    (user) => user.email.toLowerCase() === email
  );

  if (emailExists) {
    throw new Error("Ya existe una cuenta con ese correo electrónico.");
  }

  const newUser = {
    id: `demo-${Date.now()}`,
    email,
    password: userData.password,
    rol: userData.rol || "cliente",
    cuit: userData.cuit?.trim() || null,
    estado_mayorista: userData.cuit ? "PENDIENTE" : null,
  };

  saveUsers([...users, newUser]);

  const { password, ...safeUser } = newUser;

  return {
    message: "Cuenta creada correctamente.",
    user: safeUser,
  };
};

// Obtener solicitudes mayoristas
export const mockGetWholesaleRequests = async () => {
  const users = getUsers();

  return users
    .filter((user) => user.cuit)
    .map(({ password, ...safeUser }) => safeUser);
};

// Aprobar o rechazar solicitud mayorista
export const mockUpdateWholesaleStatus = async (userId, estado) => {
  if (!["APROBADO", "RECHAZADO"].includes(estado)) {
    throw new Error("El estado solicitado no es válido.");
  }

  const users = getUsers();

  const userIndex = users.findIndex((user) => user.id === userId);

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

// Obtener todos los usuarios sin exponer contraseñas
export const mockGetUsers = async () => {
  const users = getUsers();

  return users
    .filter((user) => user.rol === "cliente")
    .map(({ password, ...safeUser }) => safeUser);
};

// Crear usuario desde el panel administrativo
export const mockCreateUser = async (userData) => {
  const users = getUsers();

  const email = userData.email?.trim().toLowerCase();

  if (!email || !userData.password) {
    throw new Error("El correo y la contraseña son obligatorios.");
  }

  const emailExists = users.some(
    (user) => user.email.toLowerCase() === email
  );

  if (emailExists) {
    throw new Error("Ya existe una cuenta con ese correo electrónico.");
  }

  const cuit = userData.cuit?.trim() || null;

  const newUser = {
    id: `demo-${Date.now()}`,
    email,
    password: userData.password,
    rol: "cliente",
    cuit,
    estado_mayorista: cuit ? "PENDIENTE" : null,
  };

  saveUsers([...users, newUser]);

  const { password, ...safeUser } = newUser;

  return safeUser;
};

// Modificar datos de un usuario
export const mockUpdateUser = async (userId, changes) => {
  const users = getUsers();

  const userIndex = users.findIndex(
    (user) => user.id === userId && user.rol === "cliente"
  );

  if (userIndex === -1) {
    throw new Error("No se encontró el usuario.");
  }

  const previousUser = users[userIndex];

  const email = changes.email?.trim().toLowerCase() || previousUser.email;

  const emailExists = users.some(
    (user) =>
      user.id !== userId &&
      user.email.toLowerCase() === email
  );

  if (emailExists) {
    throw new Error("Ese correo electrónico ya está registrado.");
  }

  const cuit = changes.cuit?.trim() || null;

  let estadoMayorista = null;

  if (cuit) {
    estadoMayorista = previousUser.cuit
      ? changes.estado_mayorista || previousUser.estado_mayorista
      : "PENDIENTE";
  }

  const updatedUsers = [...users];

  updatedUsers[userIndex] = {
    ...previousUser,
    email,
    cuit,
    estado_mayorista: estadoMayorista,
  };

  saveUsers(updatedUsers);

  const { password, ...safeUser } = updatedUsers[userIndex];

  return safeUser;
};

// Eliminar usuario
export const mockDeleteUser = async (userId) => {
  const users = getUsers();

  const currentUser = JSON.parse(
    sessionStorage.getItem("user") || "null"
  );

  if (currentUser?.id === userId) {
    throw new Error("No podés eliminar tu propia cuenta.");
  }

  const userExists = users.some(
    (user) => user.id === userId && user.rol === "cliente"
  );

  if (!userExists) {
    throw new Error("No se encontró el usuario.");
  }

  const updatedUsers = users.filter(
    (user) => user.id !== userId
  );

  saveUsers(updatedUsers);

  return {
    message: "Usuario eliminado correctamente.",
  };
};

// Cerrar sesión
export const mockLogoutUser = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
};
