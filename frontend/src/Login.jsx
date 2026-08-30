import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

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
    <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center p-4 font-sans text-notion-text">
      <div className="bg-white max-w-[420px] w-full rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-notion-border overflow-hidden flex flex-col">
        
        {/* Banner/Cover Decorativo com a imagem personalizada */}
        <div 
          className="h-36 w-full relative bg-cover bg-center"
          style={{ backgroundImage: `url('/banner.jpg')` }}
        >
        </div>

        {/* Ícone sobreposto */}
        <div className="px-8 flex flex-col">
          <div className="w-[72px] h-[72px] bg-white rounded-xl shadow-sm border border-notion-border flex items-center justify-center -mt-10 mb-5 relative z-10 p-3">
            <img src="/app-logo.png" alt="Notion Dynamic Manager" className="w-full h-full object-contain" />
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
      </div>
    </div>
  );
}

export default Login;
