import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function AdminLogin() {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') {
      localStorage.setItem('admin', 'true');
      navigate('/admin');
    } else {
      alert('ParolÄƒ greÈ™itÄƒ!');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow">
      <h2 className="text-2xl font-bold mb-4">ðŸ” Autentificare Admin</h2>
      <form onSubmit={handleLogin}>
        <input
          type="password"
          placeholder="IntroduceÈ›i parola admin"
          className="border p-2 w-full mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Login</button>
      </form>
    </div>
  );
}

export default AdminLogin;

