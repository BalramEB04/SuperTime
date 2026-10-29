import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { User, UserRole } from '../types';
import { useLoginWithGoogleMutation } from '../store/api/authApi';
import { setCredentials, setUser } from '../store/slices/authSlice';
import {
   ShieldCheck,
   Building2,
   Users,
   Briefcase,
   Clock,
   AlertCircle,
   Sparkles,
   Zap,
} from 'lucide-react';
import { AmbientMesh } from './3d/AmbientMesh';
import { TiltCard } from './ui/TiltCard';

export const LoginPage: React.FC = () => {
   const dispatch = useDispatch();
   const [loginWithGoogle, { isLoading: isGoogleSigningIn }] = useLoginWithGoogleMutation();
   const [authError, setAuthError] = useState<string | null>(null);
   const initializedRef = useRef(false);

   const handleCredentialResponse = async (response: { credential?: string }) => {
      if (!response.credential) return;
      setAuthError(null);

      try {
         const authData = await loginWithGoogle(response.credential).unwrap();
         dispatch(setCredentials({
            user: authData.user,
            accessToken: authData.accessToken || authData.access_token,
            refreshToken: authData.refreshToken || authData.refresh_token,
         }));
      } catch (err: any) {
         setAuthError(err?.data?.message || err.message || 'Google SSO Authentication failed');
      }
   };

   useEffect(() => {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if (!googleClientId) {
         setAuthError('Google Client ID is not configured. Please set GOOGLE_CLIENT_ID in your .env file.');
         return;
      }

      const tryRenderGoogleButton = (): boolean => {
         if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
            try {
               (window as any).google.accounts.id.initialize({
                  client_id: googleClientId,
                  callback: handleCredentialResponse,
               });

               const btnContainer = document.getElementById('google-sso-btn-container');
               if (btnContainer) {
                  btnContainer.innerHTML = '';
                  (window as any).google.accounts.id.renderButton(btnContainer, {
                     theme: 'outline',
                     size: 'large',
                     width: 340,
                     text: 'signin_with',
                  });
                  return true;
               }
            } catch (err) {
               console.warn('Google Identity initialization error:', err);
            }
         }
         return false;
      };

      // 1. Try rendering immediately
      if (tryRenderGoogleButton()) {
         return;
      }

      // 2. If Google script is still downloading, poll until window.google is ready
      const interval = setInterval(() => {
         if (tryRenderGoogleButton()) {
            clearInterval(interval);
         }
      }, 100);

      // 3. Safety timeout after 8 seconds
      const timeout = setTimeout(() => {
         clearInterval(interval);
      }, 8000);

      return () => {
         clearInterval(interval);
         clearTimeout(timeout);
      };
   }, []);



   return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8 font-sans selection:bg-primary selection:text-white relative overflow-hidden">
         {/* 3D Ambient WebGL Particle Background */}
         <AmbientMesh opacity={0.06} color={0x6366f1} />

         {/* Background Decorative Elements */}
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
         <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-purple-100/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>

         <div className="max-w-[1200px] w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center relative z-10">

            {/* Left Column - Branding and Features (Hidden on smaller screens) */}
            <div className="hidden lg:flex flex-col">
               {/* Logo / Brand */}
               <div className="flex items-center gap-3 mb-10">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 border border-blue-50">
                     <Clock className="w-6 h-6" />
                  </div>
                  <span className="text-xl font-bold text-slate-800">
                     <span className="text-blue-600">SuperTime</span> Workspace
                  </span>
               </div>

               <h1 className="text-5xl font-extrabold text-slate-900 leading-[1.15] mb-6">
                  Welcome to <br />
                  <span className="text-blue-600">SuperTime Workspace</span>
               </h1>
               <p className="text-slate-500 text-lg mb-12 max-w-md leading-relaxed">
                  Your all-in-one solution for timesheet management, team collaboration, and productivity tracking.
               </p>

               {/* Interactive 3D Tilt Dashboard Illustration */}
               <TiltCard maxRotation={6} className="bg-white/70 backdrop-blur-md border border-white p-6 rounded-2xl shadow-xl shadow-blue-900/5 mb-12 max-w-lg">
                  <div className="flex gap-2 mb-6">
                     <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                     <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                     <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                     <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="text-[10px] text-slate-400 mb-1">Total Hours</div>
                        <div className="text-xl font-bold text-slate-800 flex items-baseline gap-1">120h <span className="text-[10px] text-emerald-500">↑ 12%</span></div>
                     </div>
                     <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="text-[10px] text-slate-400 mb-1">Projects</div>
                        <div className="text-xl font-bold text-slate-800">08</div>
                     </div>
                     <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div>
                           <div className="text-[10px] text-slate-400 mb-1">Team Members</div>
                           <div className="text-xl font-bold text-slate-800">24</div>
                        </div>
                        <Users className="w-4 h-4 text-blue-200" />
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-28 flex flex-col justify-between">
                        <div className="text-[10px] text-slate-400">Timesheet Overview</div>
                        <div className="w-full h-12 relative flex items-end">
                           <svg className="w-full h-full text-blue-500" viewBox="0 0 100 40" preserveAspectRatio="none">
                              <path d="M0 30 Q 20 10, 40 25 T 80 15 T 100 5 L 100 40 L 0 40 Z" fill="currentColor" fillOpacity="0.1" />
                              <path d="M0 30 Q 20 10, 40 25 T 80 15 T 100 5" fill="none" stroke="currentColor" strokeWidth="2" />
                              <circle cx="0" cy="30" r="2" fill="currentColor" />
                              <circle cx="40" cy="25" r="2" fill="currentColor" />
                              <circle cx="80" cy="15" r="2" fill="currentColor" />
                              <circle cx="100" cy="5" r="2" fill="currentColor" />
                           </svg>
                        </div>
                     </div>
                     <div className="w-1/3 bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
                        <div className="text-[10px] text-slate-400">Recent Activity</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></div><div className="flex-1 h-1.5 bg-slate-100 rounded-full"></div></div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div><div className="flex-1 h-1.5 bg-slate-100 rounded-full"></div></div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></div><div className="flex-1 h-1.5 bg-slate-100 rounded-full"></div></div>
                     </div>
                  </div>
               </TiltCard>
            </div>

            {/* Right Column - Auth Card */}
            <div className="w-full max-w-md mx-auto lg:max-w-none lg:mx-0 lg:ml-auto">
               {/* Mobile brand header (shown only on mobile) */}
               <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
                  <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 border border-blue-50">
                     <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-slate-800">
                     <span className="text-blue-600">SuperTime</span> Workspace
                  </span>
               </div>

               <TiltCard maxRotation={4} className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-[0_16px_40px_rgb(0,0,0,0.06)] p-8 sm:p-12 border border-slate-100/90 relative">
                  {/* Decorative small circles behind card */}
                  <div className="absolute top-10 right-10 w-2 h-2 bg-blue-100 rounded-full"></div>
                  <div className="absolute top-20 left-8 w-1.5 h-1.5 bg-purple-100 rounded-full"></div>

                  <div className="flex justify-center mb-8 relative">
                     <div className="w-20 h-20 bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.15)] relative">
                        <Clock className="w-8 h-8 text-blue-600" />
                     </div>
                  </div>

                  <h2 className="text-3xl font-bold text-center text-slate-900 mb-3 tracking-tight">Sign in to your account</h2>
                  <p className="text-center text-slate-500 text-sm mb-10 px-4">
                     Access your workspace securely using your corporate Google account.
                  </p>

                  {/* Auth Error Banner */}
                  {authError && (
                     <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="p-1 bg-white rounded-full shrink-0 shadow-sm">
                           <AlertCircle className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="leading-relaxed font-medium">{authError}</span>
                     </div>
                  )}

                  <div className="flex flex-col items-center space-y-4 relative z-10 min-h-[60px]">
                     {isGoogleSigningIn && (
                        <div className="w-full h-[60px] rounded-full border border-blue-100 bg-blue-50/50 flex items-center justify-center gap-3 animate-pulse absolute top-0 left-0 z-20">
                           <div className="w-5 h-5 border-[2.5px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                           <span className="text-blue-700 font-semibold text-[15px]">Connecting...</span>
                        </div>
                     )}
                     <div
                        id="google-sso-btn-container"
                        className={`flex justify-center w-full hover:scale-[1.02] transition-transform duration-200 ${isGoogleSigningIn ? 'opacity-0 pointer-events-none absolute' : ''}`}
                     ></div>
                  </div>

                  <div className="mt-10 relative">
                     <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-100"></div>
                     </div>
                     <div className="relative flex justify-center">
                        <span className="bg-white px-3 text-slate-300">
                           <ShieldCheck className="w-4 h-4" />
                        </span>
                     </div>
                  </div>

                  <p className="mt-4 text-center text-xs text-slate-400">
                     Secure authentication powered by Google
                  </p>
               </TiltCard>

               {/* Footer - Mobile Only */}
               <div className="mt-12 text-center text-xs text-slate-400 lg:hidden">
                  © 2026 SuperTime Workspace. All rights reserved.
               </div>
            </div>
         </div>

         {/* Footer - Desktop */}
         <div className="absolute bottom-6 w-full text-center text-xs text-slate-400 hidden lg:block">
            © 2026 SuperTime Workspace. All rights reserved.
         </div>
      </div>
   );
};

