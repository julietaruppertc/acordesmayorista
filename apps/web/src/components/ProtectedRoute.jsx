
import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

function ProtectedRoute({
  allowedRoles,
  requireApprovedWholesale = false,
}) {
  const { user } = useAuthContext();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }

  // Los clientes particulares pueden comprar sin aprobación mayorista.
  // Los usuarios con CUIT necesitan tener su solicitud aprobada.
  if (requireApprovedWholesale && user.cuit) {
    if (user.estado_mayorista === "PENDIENTE") {
      return <Navigate to="/solicitud-pendiente" replace />;
    }

    if (user.estado_mayorista === "RECHAZADO") {
      return <Navigate to="/solicitud-rechazada" replace />;
    }

    if (user.estado_mayorista !== "APROBADO") {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;
