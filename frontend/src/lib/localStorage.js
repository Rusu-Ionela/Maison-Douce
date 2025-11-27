/**
 * ✅ Standardizare localStorage — UN singur loc pentru auth
 */

export const authStorage = {
  // ✅ SETARE utilizator după login
  setUser: (userId, userRole = 'client', userData = {}) => {
    localStorage.setItem('userId', userId);
    localStorage.setItem('userRole', userRole);
    if (userData.email) localStorage.setItem('userEmail', userData.email);
    if (userData.nume) localStorage.setItem('userNume', userData.nume);
  },

  // ✅ PRELUARE date utilizator
  getUser: () => ({
    userId: localStorage.getItem('userId') || null,
    userRole: localStorage.getItem('userRole') || 'client',
    userEmail: localStorage.getItem('userEmail') || null,
    userNume: localStorage.getItem('userNume') || null,
  }),

  // ✅ LOGOUT
  clear: () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userNume');
  },

  // ✅ Check dacă e autentificat
  isLoggedIn: () => !!localStorage.getItem('userId'),

  // ✅ Check dacă e admin
  isAdmin: () => localStorage.getItem('userRole') === 'admin',
};