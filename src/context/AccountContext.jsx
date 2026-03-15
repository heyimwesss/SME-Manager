// src/context/AccountContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const AccountContext = createContext();

export const AccountProvider = ({ children }) => {
  const [activeAccount, setActiveAccount] = useState(null);

  // Load saved account from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("activeAccount");
    if (saved) setActiveAccount(JSON.parse(saved));
  }, []);

  // Save active account to localStorage whenever it changes
  useEffect(() => {
    if (activeAccount) {
      localStorage.setItem("activeAccount", JSON.stringify(activeAccount));
    } else {
      localStorage.removeItem("activeAccount");
    }
  }, [activeAccount]);

  // Login function: set active account
  const login = (account) => setActiveAccount(account);

  // Logout function: clear active account
  const logout = () => setActiveAccount(null);

  return (
    <AccountContext.Provider value={{ activeAccount, setActiveAccount, login, logout }}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => useContext(AccountContext);
