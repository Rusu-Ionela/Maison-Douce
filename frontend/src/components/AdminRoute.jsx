import React from 'react';
import { Navigate } from 'react-router-dom';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

const AdminRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem('user'));

    return user && user.isAdmin ? children : <Navigate to="/login" />;
};

export default AdminRoute;

