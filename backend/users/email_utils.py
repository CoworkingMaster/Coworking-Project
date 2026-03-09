"""
Envío de correo mediante Gmail API (OAuth2).
Credenciales configuradas en settings.py / variables de entorno.
"""
import base64
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


def _build_gmail_service():
    """Construye el cliente de Gmail API con las credenciales OAuth2 del proyecto."""
    creds = Credentials(
        token=None,  # se refrescará automáticamente
        refresh_token=os.getenv('GMAIL_REFRESH_TOKEN'),
        token_uri='https://oauth2.googleapis.com/token',
        client_id=os.getenv('GMAIL_CLIENT_ID'),
        client_secret=os.getenv('GMAIL_CLIENT_SECRET'),
        scopes=['https://mail.google.com/'],
    )
    return build('gmail', 'v1', credentials=creds, cache_discovery=False)


def send_password_reset_email(to_email: str, user_name: str, reset_url: str) -> bool:
    """
    Envía el correo de recuperación de contraseña.
    Devuelve True si se envió correctamente, False en caso de error.
    """
    html_body = _build_reset_email_html(user_name, reset_url)

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Restablece tu contraseña — WorkHub'
    msg['From'] = os.getenv('GMAIL_SENDER', 'WorkHub <noreply@workhub.com>')
    msg['To'] = to_email
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    try:
        service = _build_gmail_service()
        service.users().messages().send(
            userId='me',
            body={'raw': raw}
        ).execute()
        return True
    except Exception as exc:  # noqa: BLE001
        print(f'[email_utils] Error al enviar email: {exc}')
        return False


def _build_reset_email_html(user_name: str, reset_url: str) -> str:
    """Genera el HTML del correo de recuperación acorde al estilo del proyecto."""
    first_name = user_name.strip().split()[0] if user_name.strip() else 'usuario'
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Restablece tu contraseña — WorkHub</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:48px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#13131a;border-radius:20px;overflow:hidden;
                      border:1px solid rgba(255,255,255,0.08);max-width:560px;width:100%;">

          <!-- Header con gradiente -->
          <tr>
            <td style="background:linear-gradient(135deg,#6c63ff 0%,#a855f7 50%,#ec4899 100%);
                       padding:40px 48px;text-align:center;">
              <div style="font-size:42px;margin-bottom:12px;">◆</div>
              <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;
                         letter-spacing:-0.5px;">WorkHub</h1>
              <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">
                Tu espacio de trabajo inteligente
              </p>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:48px 48px 40px;">
              <h2 style="color:#f1f1f1;margin:0 0 16px;font-size:22px;font-weight:600;">
                Hola, {first_name} 👋
              </h2>
              <p style="color:#9ca3af;margin:0 0 24px;font-size:15px;line-height:1.7;">
                Hemos recibido una solicitud para restablecer la contraseña de tu cuenta
                en <strong style="color:#a78bfa;">WorkHub</strong>. Si no fuiste tú, puedes
                ignorar este mensaje con total seguridad.
              </p>

              <!-- Separador -->
              <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 32px;"></div>

              <!-- Botón CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{reset_url}"
                       style="display:inline-block;
                              background:linear-gradient(135deg,#6c63ff,#a855f7);
                              color:#ffffff;text-decoration:none;
                              font-size:16px;font-weight:600;
                              padding:14px 40px;border-radius:12px;
                              letter-spacing:0.3px;
                              box-shadow:0 4px 24px rgba(108,99,255,0.35);">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternativa texto -->
              <p style="color:#6b7280;margin:28px 0 0;font-size:13px;line-height:1.6;text-align:center;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
                <a href="{reset_url}"
                   style="color:#a78bfa;word-break:break-all;">{reset_url}</a>
              </p>

              <!-- Aviso de expiración -->
              <div style="margin:32px 0 0;padding:16px 20px;
                          background:rgba(251,191,36,0.08);border-radius:10px;
                          border-left:3px solid #f59e0b;">
                <p style="color:#fbbf24;margin:0;font-size:13px;font-weight:500;">
                  ⏱ Este enlace caduca en <strong>1 hora</strong>.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="color:#4b5563;margin:0;font-size:12px;line-height:1.6;text-align:center;">
                © 2026 WorkHub · Todos los derechos reservados<br/>
                Si tienes alguna duda escríbenos a
                <a href="mailto:support@workhub.com"
                   style="color:#7c3aed;text-decoration:none;">support@workhub.com</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
  <!-- /Wrapper -->

</body>
</html>"""
