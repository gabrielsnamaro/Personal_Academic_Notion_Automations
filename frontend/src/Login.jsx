import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { Card } from "@/components/ui/card";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function Login({ onLoginSuccess }) {
  const handleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(`${API_URL}/auth/google`, {
        credential: credentialResponse.credential,
      });
      localStorage.setItem('auth_token', res.data.token);
      onLoginSuccess(res.data.user);
    } catch (error) {
      console.error("Falha no login", error);
      alert(error.response?.data?.error || "Acesso Negado.");
    }
  };

  const handleError = () => {
    console.error("Login Failed");
    alert("Falha na autenticação com o Google.");
  };

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
        >
        </div>

        {/* Ícone sobreposto e flutuante */}
        <div className="px-8 flex flex-col">
          <div className="w-16 h-16 -mt-8 mb-4 relative z-10">
            <img src="/app-logo.png" alt="Notion Dynamic Manager" className="w-full h-full object-contain drop-shadow-sm" />
          </div>

          <h1 className="text-[22px] font-bold tracking-tight mb-2">Notion Dynamic Manager</h1>
          <p className="text-[14px] text-notion-muted mb-8 leading-relaxed">
            Seu workspace pessoal para automatizar fluxos de estudo, organizar tarefas e planejar suas revisões ativas.
          </p>

          <div className="w-full flex justify-center border-t border-notion-border pt-8 pb-4">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              useOneTap
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
              width="100%"
            />
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
