const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { GOOGLE_OAUTH_CLIENT_ID, AUTHORIZED_EMAIL, JWT_SECRET } = require('../config');

const client = new OAuth2Client(GOOGLE_OAUTH_CLIENT_ID);

class AuthController {
    static loginWithGoogle = async (req, res) => {
        try {
            const { credential, access_token } = req.body;

            let payload;

            if (access_token) {
                // Autenticação via useGoogleLogin (Popup customizado)
                const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${access_token}` }
                });
                
                if (!googleRes.ok) {
                    return res.status(401).json({ error: "Token de acesso do Google inválido." });
                }
                payload = await googleRes.json();
            } else if (credential) {
                // Autenticação via ID Token
                const ticket = await client.verifyIdToken({
                    idToken: credential,
                    audience: GOOGLE_OAUTH_CLIENT_ID,
                });
                payload = ticket.getPayload();
            } else {
                return res.status(400).json({ error: "Nenhuma credencial ou token fornecido." });
            }

            const email = (payload.email || "").toLowerCase().trim();
            const expectedEmail = (AUTHORIZED_EMAIL || "").toLowerCase().trim();

            console.log(`[AUTH DEBUG] E-mail do Google: '${email}' | Esperado na .env: '${expectedEmail}'`);

            // Sistema de Allowlist sem banco de dados
            if (email !== expectedEmail) {
                console.warn(`Tentativa de acesso não autorizada pelo e-mail: ${email}`);
                return res.status(403).json({ error: `Acesso Negado: O e-mail ${email} não está autorizado.` });
            }

            // Gera o JWT local (validade de 24h)
            const token = jwt.sign(
                { email: payload.email, name: payload.name, picture: payload.picture },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.json({
                message: "Login bem-sucedido.",
                token,
                user: {
                    name: payload.name,
                    email: payload.email,
                    picture: payload.picture
                }
            });

        } catch (error) {
            console.error("Erro na autenticação:", error);
            return res.status(500).json({ error: "Erro interno no servidor de autenticação." });
        }
    }
}

module.exports = AuthController;
