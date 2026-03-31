"""
Zahi Connect - Email Service
Mirrors MyCalo's django.core.mail.send_mail and aws_utils.send_to_email_queue.
Uses SMTP directly; prints to console if SMTP not configured (dev mode).
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import settings


def _send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Core email sender — equivalent to Django's send_mail().
    Falls back to console print if SMTP is not configured.
    """
    if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
        # Dev fallback (like Django's console email backend)
        print(f"═══════════════════════════════════════════")
        print(f"  📧 EMAIL (dev fallback)")
        print(f"  To:      {to_email}")
        print(f"  Subject: {subject}")
        print(f"  Body:    {body}")
        print(f"═══════════════════════════════════════════")
        return True

    try:
        msg = MIMEMultipart()
        msg["From"] = f"Zahi Connect <{settings.EMAIL_HOST_USER}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.starttls()
            server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
            server.send_message(msg)

        print(f"✅ Email sent to {to_email}")
        return True

    except Exception as e:
        print(f"❌ Email send failed: {str(e)}")
        return False


def send_otp_email(to_email: str, otp_code: str) -> bool:
    """
    Mirrors MyCalo's RegisterView send_mail call:
    send_mail("Mycalo AI Verification Code", f"Your ... code is {otp_code}...", ...)
    """
    return _send_email(
        to_email=to_email,
        subject="Zahi Connect - Verification Code",
        body=(
            f"Your Zahi Connect verification code is {otp_code}. "
            "Please do not share this code with anyone."
        ),
    )


def send_password_reset_email(to_email: str, otp_code: str) -> bool:
    """
    Mirrors MyCalo's ForgotPasswordView send_to_email_queue:
    send_to_email_queue("Reset Your Password - Mycalo AI", f"Your ... OTP is: {otp_code}", email)
    """
    return _send_email(
        to_email=to_email,
        subject="Reset Your Password - Zahi Connect",
        body=f"Your Password Reset OTP is: {otp_code}",
    )
