# services/email.py
import html
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from core.config import settings

logger = logging.getLogger(__name__)


# ── TRANSPORT ──
def send_email(to: str, subject: str, html_body: str) -> bool:
    """Send HTML email over Gmail SMTP (SSL). Returns True/False."""
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — skipping '%s' to %s", subject, to)
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info("✅ Email sent to %s — %s", to, subject)
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error(
            "❌ Gmail rejected credentials for %s — is SMTP_PASSWORD an App "
            "Password (not your login)? %s", settings.SMTP_USERNAME, e,
        )
        return False
    except Exception as e:
        logger.error("❌ Email failed to %s: %s", to, e)
        return False


# ── HELPERS ──
def _fmt_date(value) -> str:
    return value.strftime("%A, %d %B %Y") if value else "—"


def _fmt_time(value) -> str:
    return value.strftime("%I:%M %p").lstrip("0") if value else "—"


def _pretty(value: str) -> str:
    return str(value).replace("_", " ").title() if value else "—"


# ── BASE TEMPLATE ──
BASE_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }}
        .header h1 {{ color: #ffffff; margin: 0; font-size: 24px; }}
        .header p {{ color: #e0e0e0; margin: 5px 0 0; font-size: 14px; }}
        .content {{ padding: 30px; color: #333333; line-height: 1.6; }}
        .content h2 {{ color: #667eea; margin-top: 0; }}
        .btn {{ display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0; }}
        .stat-box {{ background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 10px 0; border-radius: 0 8px 8px 0; }}
        .stat-label {{ font-size: 12px; color: #888; text-transform: uppercase; }}
        .stat-value {{ font-size: 20px; font-weight: bold; color: #333; }}
        .code-box {{ background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }}
        .code-box h1 {{ margin: 10px 0; color: #333; letter-spacing: 8px; font-size: 34px; }}
        .footer {{ background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #888; }}
        .urgent {{ color: #e74c3c; font-weight: bold; }}
        .success {{ color: #27ae60; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 MedSync</h1>
            <p>Your Health, Tracked</p>
        </div>
        <div class="content">
            {content}
        </div>
        <div class="footer">
            <p>MedSync — Stay healthy, stay consistent 💊</p>
        </div>
    </div>
</body>
</html>
"""


# ── EMAIL TEMPLATES ──

def send_welcome_email(user) -> bool:
    content = f"""
        <h2>👋 Welcome to MedSync!</h2>
        <p>Hey <strong>{html.escape(user.full_name)}</strong>,</p>
        <p>You're all set. Here's what you can do:</p>
        <div class="stat-box">
            <p>✅ Book appointments with campus doctors</p>
            <p>✅ Receive and scan prescriptions</p>
            <p>✅ Track your medications</p>
            <p>✅ Keep your streak alive 🔥</p>
        </div>
        <p>Start by booking your first appointment.</p>
        <a href="{html.escape(settings.FRONTEND_URL)}" class="btn">Get Started</a>
    """
    html_body = BASE_TEMPLATE.format(content=content)
    return send_email(user.email, "👋 Welcome to MedSync!", html_body)

def send_doctor_welcome_email(user) -> bool:
    """Welcome email for a doctor account created by an admin."""
    specialization = getattr(user.specialization, "value", user.specialization)
    specialization = html.escape(str(specialization).replace("_", " ").title())

    content = f"""
        <h2>Your {html.escape(settings.APP_NAME)} doctor account is ready</h2>
        <p>Hello Dr. <strong>{html.escape(user.full_name)}</strong>,</p>
        <p>An administrator has created your doctor account on {html.escape(settings.APP_NAME)}.</p>
        <div class="stat-box">
            <div class="stat-label">Specialization</div>
            <div class="stat-value">{specialization}</div>
        </div>
        <p>To get started, sign in with your email address and the password
        your administrator set for you. If you don't have it, use
        <em>Forgot password</em> to reset it.</p>
        <a href="{html.escape(settings.FRONTEND_URL)}" class="btn">Sign in to {html.escape(settings.APP_NAME)}</a>
    """

    return send_email(
        user.email,
        f"Your {settings.APP_NAME} doctor account is ready",
        BASE_TEMPLATE.format(content=content),
    )

def send_otp_email(user, otp: str) -> bool:
    content = f"""
        <h2>🔐 Password Reset</h2>
        <p>Hey <strong>{html.escape(user.full_name)}</strong>,</p>
        <p>Use this code to reset your password. It expires in
           <strong>{settings.OTP_EXPIRE_MINUTES} minutes</strong>.</p>
        <div class="code-box">
            <p style="margin:0; color:#666;">Your code</p>
            <h1>{html.escape(otp)}</h1>
        </div>
        <p style="color:#888;">If you didn't request this, you can ignore this email.</p>
    """
    html_body = BASE_TEMPLATE.format(content=content)
    return send_email(user.email, "🔐 Your password reset code", html_body)


def send_appointment_confirmed_email(patient, appointment, doctor) -> bool:
    content = f"""
        <h2>✅ Appointment Confirmed</h2>
        <p>Hey <strong>{html.escape(patient.full_name)}</strong>,</p>
        <p>Your appointment has been <span class="success">confirmed</span>.</p>
        <div class="stat-box">
            <div class="stat-label">Doctor</div>
            <div class="stat-value">Dr. {html.escape(doctor.full_name)}
                ({_pretty(doctor.specialization)})</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Date &amp; Time</div>
            <div class="stat-value">{_fmt_date(appointment.appointment_date)} — {_fmt_time(appointment.appointment_time)}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Reason</div>
            <div class="stat-value">{html.escape(appointment.reason or "—")}</div>
        </div>
        <a href="{html.escape(settings.FRONTEND_URL)}" class="btn">View Appointment</a>
    """
    html_body = BASE_TEMPLATE.format(content=content)
    return send_email(patient.email, "✅ Appointment confirmed", html_body)


def send_appointment_cancelled_email(patient, appointment) -> bool:
    content = f"""
        <h2>📅 Appointment Cancelled</h2>
        <p>Hey <strong>{html.escape(patient.full_name)}</strong>,</p>
        <p>Your appointment on
           <span class="urgent">{_fmt_date(appointment.appointment_date)}</span>
           at <strong>{_fmt_time(appointment.appointment_time)}</strong>
           has been cancelled.</p>
        <p>You can book a new one anytime.</p>
        <a href="{html.escape(settings.FRONTEND_URL)}" class="btn">Book Again</a>
    """
    html_body = BASE_TEMPLATE.format(content=content)
    return send_email(patient.email, "📅 Appointment cancelled", html_body)


def send_prescription_ready_email(patient, prescription) -> bool:
    content = f"""
        <h2>📋 Prescription Ready</h2>
        <p>Hey <strong>{html.escape(patient.full_name)}</strong>,</p>
        <p>Your prescription is ready. Open MedSync to view it and scan the QR
           code at the pharmacy.</p>
        <a href="{html.escape(settings.FRONTEND_URL)}" class="btn">View Prescription</a>
    """
    html_body = BASE_TEMPLATE.format(content=content)
    return send_email(patient.email, "📋 Your prescription is ready", html_body)


def send_medication_reminder_email(patient, medication) -> bool:
    content = f"""
        <h2>💊 Medication Reminder</h2>
        <p>Hey <strong>{html.escape(patient.full_name)}</strong>,</p>
        <p>It's time to take your medication:</p>
        <div class="stat-box">
            <div class="stat-label">Drug</div>
            <div class="stat-value">{html.escape(medication.drug_name)}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Dosage</div>
            <div class="stat-value">{html.escape(medication.dosage)}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Frequency</div>
            <div class="stat-value">{_pretty(medication.frequency)}</div>
        </div>
        <p>Mark it as taken in the app so your streak stays alive! 🔥</p>
        <a href="{html.escape(settings.FRONTEND_URL)}" class="btn">Mark as Taken</a>
    """
    html_body = BASE_TEMPLATE.format(content=content)
    return send_email(patient.email, f"💊 Time to take {medication.drug_name}", html_body)


def send_medication_completion_email(patient, medication) -> bool:
    content = f"""
        <h2>🎉 Course Completed!</h2>
        <p>Hey <strong>{html.escape(patient.full_name)}</strong>,</p>
        <p>You've completed your course of
           <strong>{html.escape(medication.drug_name)}</strong>. Well done!</p>
        <div class="stat-box">
            <div class="stat-label">Medication</div>
            <div class="stat-value">{html.escape(medication.drug_name)}</div>
        </div>
        <p>Review your adherence history in MedSync.</p>
        <a href="{html.escape(settings.FRONTEND_URL)}" class="btn">View History</a>
    """
    html_body = BASE_TEMPLATE.format(content=content)
    return send_email(patient.email, f"🎉 Course completed: {medication.drug_name}", html_body)
