import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Loader from '../components/Loader';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

// Mirror the backend LoginSchema (AuthValidation.js)
const LoginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setServerError('');
    try {
      const res = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      const user = res.data;
      await login(user);
      toast.success(`Welcome back! Signing you in…`);

      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/employee');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Authentication failed';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loader fullScreen={true} message="Connecting to server..." />;
  }

  if (isSubmitting) {
    return <Loader fullScreen={true} message="Authenticating..." />;
  }

  return (
    <div className="min-h-screen flex font-sans bg-[#020B1A]">
      {/* Left Side - Logo */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-[#010813] relative overflow-hidden border-r border-gray-800/50">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-[#AED500] via-transparent to-transparent"></div>
        <img src="/Logo.png" alt="Hit Dashboard Logo" className="w-80 h-80 object-contain relative z-10 drop-shadow-2xl" />
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-[#020B1A]">
        <div className="w-full max-w-md">
          <div className="text-center lg:text-left mb-8">
            <img src="/Logo.png" alt="Hit Dashboard Logo" className="w-24 h-24 object-contain mx-auto lg:hidden mb-6" />
            <h2 className="text-3xl font-bold text-white tracking-tight text-center">Welcome Back</h2>
            <p className="text-gray-400 mt-2 text-center">Please sign in to your account</p>
          </div>

          {/* Server-side error */}
          {serverError && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6 text-center">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            {/* Email / Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className={`w-full border rounded-lg py-3 px-4 bg-[#0f1a2e] text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder-gray-500 ${errors.email
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-700 focus:ring-[#AED500]'
                  }`}
                placeholder="email address"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`w-full border rounded-lg py-3 pl-4 pr-12 bg-[#0f1a2e] text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder-gray-500 ${errors.password
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-700 focus:ring-[#AED500]'
                    }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-200 transition-colors focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#AED500] hover:bg-[#9cc000] text-[#020B1A] font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer"
            >
              Sign In
            </button>
          </form>

          {/* <div className="mt-8 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[#AED500] hover:text-[#9cc000] transition-colors">
              Sign up
            </Link>
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default Login;
