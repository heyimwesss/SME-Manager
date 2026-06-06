import { useAccount } from "../context/AccountContext";
import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const { activeAccount, loading } = useAccount();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!activeAccount) {
    return <Navigate to="/" />;
  }

  if (!activeAccount.is_admin) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}