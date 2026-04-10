import { Navigate } from "react-router-dom";

export default function RestaurantSettingsRedirect() {
  return <Navigate to="/dashboard/settings/general" replace />;
}
