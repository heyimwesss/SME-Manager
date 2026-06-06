import { createContext, useContext, useState, useEffect } from "react";

const AccountContext = createContext();

export const AccountProvider = ({ children }) => {
  const [activeAccount, setActiveAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load saved account from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("activeAccount");

    if (saved) {
      setActiveAccount(JSON.parse(saved));
    }

    setLoading(false); // IMPORTANT
  }, []);

  // Save active account to localStorage whenever it changes
  useEffect(() => {
    if (activeAccount) {
      localStorage.setItem(
        "activeAccount",
        JSON.stringify(activeAccount)
      );
    } else {
      localStorage.removeItem("activeAccount");
    }
  }, [activeAccount]);

  const login = (account) => setActiveAccount(account);
  const logout = () => setActiveAccount(null);

  return (
    <AccountContext.Provider
      value={{
        activeAccount,
        setActiveAccount,
        login,
        logout,
        loading, // IMPORTANT
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => useContext(AccountContext);