import { useAccount } from "../context/AccountContext";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { activeAccount, loading } = useAccount();

  if (loading) return null;

  if (!activeAccount) {
    return <Navigate to="/accounts" replace />;
  }

  return children;
}
<Route
  path="/transactions"
  element={
    <ProtectedRoute>
      <Transactions />
    </ProtectedRoute>
  }
/>