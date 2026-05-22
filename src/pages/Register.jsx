import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Loader from '../components/Loader';
import api from '../api/axios';
import { useToast } from '../components/Toast';

const RegisterSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  role: z.enum(['user', 'admin']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  ) : null;

const inputCls = (hasError) =>
  `w-full border rounded-lg py-3 px-4 bg-[#0f1a2e] text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder-gray-500 ${
    hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-[#AED500]'
  }`;

function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: 'user',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setServerError('');
    try {
      await api.post('/auth/register', {
        name: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role
      });

      toast.success('Account created successfully! Please login.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loader fullScreen={true} message="Initializing registration..." />;
  }

  if (isSubmitting) {
    return <Loader fullScreen={true} message="Creating account..." />;
  }

  return (
    <div className="min-h-screen flex font-sans bg-[#020B1A]">
      {/* Left Side - Logo */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-[#010813] relative overflow-hidden border-r border-gray-800/50">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#AED500] via-transparent to-transparent"></div>
        <img src="/Logo.png" alt="Hit Dashboard Logo" className="w-80 h-80 object-contain relative z-10 drop-shadow-2xl" />
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-[#020B1A]">
        <div className="w-full max-w-md">
          <div className="text-center lg:text-left mb-8">
            <img src="/Logo.png" alt="Hit Dashboard Logo" className="w-24 h-24 object-contain mx-auto lg:hidden mb-6" />
            <h2 className="text-3xl font-bold text-white tracking-tight">Create an Account</h2>
            <p className="text-gray-400 mt-2">Join Hit Dashboard today</p>
          </div>

          {/* Server-side error */}
          {serverError && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6 text-center animate-fade-in">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                {...register('fullName')}
                className={inputCls(errors.fullName)}
                placeholder="John Doe"
              />
              <FieldError message={errors.fullName?.message} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Email Address</label>
              <input
                type="email"
                {...register('email')}
                className={inputCls(errors.email)}
                placeholder="you@example.com"
              />
              <FieldError message={errors.email?.message} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Role</label>
              <select
                {...register('role')}
                className={inputCls(errors.role)}
              >
                <option value="user" className="bg-[#0f1a2e] text-white">Employee / User</option>
                <option value="admin" className="bg-[#0f1a2e] text-white">Admin</option>
              </select>
              <FieldError message={errors.role?.message} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  {...register('password')}
                  className={inputCls(errors.password)}
                  placeholder="••••••••"
                />
                <FieldError message={errors.password?.message} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Confirm</label>
                <input
                  type="password"
                  {...register('confirmPassword')}
                  className={inputCls(errors.confirmPassword)}
                  placeholder="••••••••"
                />
                <FieldError message={errors.confirmPassword?.message} />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#AED500] hover:bg-[#9cc000] text-[#020B1A] font-bold py-3 px-4 rounded-lg shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 mt-4 cursor-pointer"
            >
              Sign Up
            </button>
          </form>

          <div className="mt-8 text-center lg:text-left text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#AED500] hover:text-[#9cc000] transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
