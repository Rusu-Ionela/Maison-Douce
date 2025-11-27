import React from 'react';
import { Navigate } from 'react-router-dom';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

const PrivateRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem('user'));

    return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;

