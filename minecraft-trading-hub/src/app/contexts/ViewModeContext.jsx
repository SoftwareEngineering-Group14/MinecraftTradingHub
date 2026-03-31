"use client";

import { createContext, useContext, useState } from 'react';

const ViewModeContext = createContext({
  isAdmin: false,
  isAdminView: false,
  setIsAdminView: () => {},
});

export function ViewModeProvider({ children, isAdmin }) {
  const [isAdminView, setIsAdminView] = useState(false);

  return (
    <ViewModeContext.Provider
      value={{
        isAdmin,
        // Only allow admin view if the user actually is an admin
        isAdminView: isAdmin && isAdminView,
        setIsAdminView,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export const useViewMode = () => useContext(ViewModeContext);
