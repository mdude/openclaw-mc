'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/missioncontrol/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      window.location.href = '/missioncontrol';
    } else {
      setError('Invalid credentials');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">🚀 Mission Control</h1>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <input
          type="text" placeholder="Username" value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
        <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition">
          Sign In
        </button>
      </form>
    </div>
  );
}
