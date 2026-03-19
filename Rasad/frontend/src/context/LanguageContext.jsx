import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ur' : 'en'));
  };

  const t = (en, ur) => {
    return language === 'ur' ? <span className="urdu-text">{ur}</span> : en;
  };

  const ts = (en, ur) => {
    return language === 'ur' ? ur : en;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, ts }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
