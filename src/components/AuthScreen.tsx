import { useState } from 'react';
import { authApi } from '../utils/api';
import { Store, Phone, Clock, MessageCircle, AlertCircle } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (session: any) => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPendingMessage, setShowPendingMessage] = useState(false);
  const [isInactive, setIsInactive] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({
    email: '', password: '', confirmPassword: '', shopName: '', ownerName: '', phone: '', address: '',
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsInactive(false);
    setIsPending(false);
    setLoading(true);

    try {
      const result = await authApi.login(signInData.email, signInData.password);

      // 🛑 Block inactive users
      if (result.isInactive || (result.shop && result.shop.status === 'inactive')) {
        setIsInactive(true);
        setLoading(false);
        return;
      }

      // 🛑 Block pending users
      if (result.isPending || (result.shop && result.shop.status === 'pending')) {
        setIsPending(true);
        setLoading(false);
        return;
      }

      // 🛑 Show any other error from backend
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // ✅ Success — must have token and shop
      if (result.token && result.shop) {
        onAuthSuccess(result);
      } else {
        setError('Login failed. Please try again.');
      }

    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowPendingMessage(false);
    if (signUpData.password !== signUpData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const result = await authApi.register({
        ...signUpData,
        role: 'admin', // all signups are admin role by default
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      // All signups go to pending
      setShowPendingMessage(true);
      setIsSignUp(false);

    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4 shadow-lg">
            <Store className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Bms Management System</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setIsSignUp(false); setError(''); setIsInactive(false); setIsPending(false); setShowPendingMessage(false); }}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${!isSignUp ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(''); setIsInactive(false); setIsPending(false); setShowPendingMessage(false); }}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${isSignUp ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}
            >
              Sign Up
            </button>
          </div>

          {/* 🔴 INACTIVE CONTACT CARD */}
          {isInactive && (
            <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2 text-amber-800 font-bold text-sm uppercase">
                <AlertCircle size={18} /> Account Restricted
              </div>
              <p className="text-xs text-amber-700 mb-4 font-medium leading-relaxed">
                Your shop is currently <strong>Inactive</strong>. Access is disabled until reactivated by the administrator.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a href="https://wa.me/92328762690" target="_blank" className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-2 rounded-lg text-xs font-bold shadow-sm">
                  <MessageCircle size={14} /> WhatsApp
                </a>
                <a href="tel:+92328762690" className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold shadow-sm">
                  <Phone size={14} /> Call Admin
                </a>
              </div>
            </div>
          )}

          {/* 🟡 PENDING APPROVAL CARD */}
          {isPending && (
            <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2 text-yellow-800 font-bold text-sm uppercase">
                <Clock size={18} /> Pending Approval
              </div>
              <p className="text-xs text-yellow-700 mb-4 font-medium leading-relaxed">
                Your account is <strong>pending approval</strong> by the administrator. Please wait or contact admin.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a href="https://wa.me/92328762690" target="_blank" className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-2 rounded-lg text-xs font-bold shadow-sm">
                  <MessageCircle size={14} /> WhatsApp
                </a>
                <a href="tel:+92328762690" className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold shadow-sm">
                  <Phone size={14} /> Call Admin
                </a>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-bold">
              {error}
            </div>
          )}

          {!isSignUp ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <input
                type="email" required
                value={signInData.email}
                onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Email"
              />
              <input
                type="password" required
                value={signInData.password}
                onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Password"
              />
              <button
                type="submit" disabled={loading}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold shadow-md active:scale-95 transition-transform"
              >
                {loading ? 'Checking...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              <input type="text" required placeholder="Shop Name" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" value={signUpData.shopName} onChange={(e) => setSignUpData({ ...signUpData, shopName: e.target.value })} />
              <input type="text" required placeholder="Owner Name" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" value={signUpData.ownerName} onChange={(e) => setSignUpData({ ...signUpData, ownerName: e.target.value })} />
              <input type="email" required placeholder="Email" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" value={signUpData.email} onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })} />
              <input type="tel" placeholder="Phone" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" value={signUpData.phone} onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })} />
              <textarea placeholder="Address" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" value={signUpData.address} onChange={(e) => setSignUpData({ ...signUpData, address: e.target.value })} />
              <input type="password" required placeholder="Password" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" value={signUpData.password} onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })} />
              <input type="password" required placeholder="Confirm Password" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" value={signUpData.confirmPassword} onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })} />
              <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold shadow-md">
                {loading ? 'Creating...' : 'Register Shop'}
              </button>
            </form>
          )}
        </div>

        {/* ✅ SIGNUP SUCCESS - PENDING MESSAGE */}
        {showPendingMessage && (
          <div className="bg-white border-2 border-amber-100 rounded-2xl p-6 mt-4 shadow-lg">
            <div className="flex items-center gap-2 mb-2 text-amber-800 font-bold">
              <Clock size={18} /> Pending Approval
            </div>
            <p className="text-xs text-gray-600 mb-4 font-medium">
              Your request is submitted. Send payment proof to: <strong>03287627690</strong>
            </p>
            <div className="flex gap-2">
              <a href="https://wa.me/923287627690" className="flex-1 bg-[#25D366] text-white py-2 rounded-lg text-center text-xs font-bold">WhatsApp</a>
              <a href="tel:+923287627690" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-center text-xs font-bold">Call Now</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}