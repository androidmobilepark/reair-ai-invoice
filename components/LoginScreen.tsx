
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { UserCircle2, Lock, Shield, Wrench, BadgeDollarSign, Eye, EyeOff, ChevronRight } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
  users: UserProfile[];
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, users }) => {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const getRoleIcon = (role: string) => {
      switch(role) {
          case 'Admin': return <Shield size={16} className="text-blue-600" />;
          case 'Technician': return <Wrench size={16} className="text-amber-600" />;
          case 'Sales': return <BadgeDollarSign size={16} className="text-emerald-600" />;
          default: return <UserCircle2 size={16} />;
      }
  };

  const handleUserSelect = (user: UserProfile) => {
      setSelectedUser(user);
      setPassword('');
      setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUser) return;

      // Check password
      // Note: In a real app, never store plain text passwords. Use bcrypt/hashing.
      if (password === selectedUser.password) {
          onLogin(selectedUser);
      } else {
          setError('Incorrect password. Please try again.');
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Android Mobile Park</h1>
            <p className="text-blue-100">Just Live For You</p>
        </div>
        
        <div className="p-8">
            {!selectedUser ? (
                <>
                    <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Select User</h2>
                    <div className="space-y-4">
                        {users.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleUserSelect(user)}
                                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 group-hover:bg-blue-200 group-hover:text-blue-700 border border-slate-200">
                                        {user.avatarInitials}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-800">{user.name}</p>
                                        <div className="flex items-center space-x-1 text-xs text-slate-500">
                                            {getRoleIcon(user.role)}
                                            <span>{user.role}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-slate-300 group-hover:text-blue-600">
                                    <ChevronRight size={20} />
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                <form onSubmit={handleSubmit} className="animate-fade-in">
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 font-bold text-2xl flex items-center justify-center mx-auto mb-3 border-4 border-white shadow-md">
                            {selectedUser.avatarInitials}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">{selectedUser.name}</h2>
                        <p className="text-sm text-slate-500">{selectedUser.role}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Enter Password"
                                autoFocus
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                        
                        {error && (
                            <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg font-medium animate-shake">
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors"
                        >
                            Login
                        </button>
                        
                        <button 
                            type="button"
                            onClick={() => setSelectedUser(null)}
                            className="w-full text-slate-500 text-sm hover:text-slate-700 py-2"
                        >
                            Back to User Selection
                        </button>
                    </div>
                </form>
            )}
            
            <p className="mt-8 text-center text-xs text-slate-400">
                Secure Access • Internal Use Only
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
