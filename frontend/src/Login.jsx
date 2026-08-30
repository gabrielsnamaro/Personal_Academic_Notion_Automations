import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function Login({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await axios.post(`${API_URL}/auth/google`, {
          access_token: tokenResponse.access_token,
        });
        localStorage.setItem('auth_token', res.data.token);
        onLoginSuccess(res.data.user);
      } catch (error) {
        console.error("Falha no login", error);
        alert(error.response?.data?.error || "Acesso Negado.");
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error("Login Failed:", error);
      alert("Falha na autenticação com o Google.");
      setLoading(false);
    },
  });

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans text-notion-text relative overflow-hidden">
      {/* Imagem de fundo com desfoque suave cinematográfico */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-[3px] scale-105"
        style={{ backgroundImage: `url('/login-bg.jpg')` }}
      />
      
      {/* Overlay sutil escuro para contraste */}
      <div className="absolute inset-0 bg-black/25" />

      <Card className="max-w-[420px] w-full rounded-xl shadow-2xl border border-notion-border bg-white/95 backdrop-blur-sm overflow-hidden flex flex-col p-0 relative z-10">
        
        {/* Banner/Cover Decorativo com a imagem personalizada */}
        <div 
          className="h-36 w-full relative bg-cover bg-center"
          style={{ backgroundImage: `url('/banner.jpg')` }}
        />

        {/* Ícone sobreposto e flutuante */}
        <div className="px-8 flex flex-col">
          <div className="w-16 h-16 -mt-8 mb-4 relative z-10">
            <img src="/app-logo.png" alt="Notion Dynamic Manager" className="w-full h-full object-contain drop-shadow-sm" />
          </div>

          <h1 className="text-[22px] font-bold tracking-tight mb-2">Notion Dynamic Manager</h1>
          <p className="text-[14px] text-notion-muted mb-8 leading-relaxed">
            Seu workspace pessoal para automatizar fluxos de estudo, organizar tarefas e planejar suas revisões ativas.
          </p>

          <div className="w-full flex justify-center border-t border-notion-border pt-6 pb-4">
            <Button
              type="button"
              disabled={loading}
              onClick={() => googleLogin()}
              className="w-full h-11 bg-[#2f2f2f] hover:bg-[#1a1a1a] text-white font-medium flex items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
            >
              <div className="bg-white p-1 rounded-full flex items-center justify-center">
                <GoogleIcon />
              </div>
              <span>{loading ? "Autenticando..." : "Continuar com o Google"}</span>
            </Button>
          </div>
          
          <div className="text-center pb-8">
            <span className="text-[11px] font-medium text-notion-muted/70 uppercase tracking-wider">Acesso restrito (Allowlist)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Login;
