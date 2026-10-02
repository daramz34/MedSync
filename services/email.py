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

        logger.info("Email sent to %s — %s", to, subject)
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error(
            "Gmail rejected credentials for %s — is SMTP_PASSWORD an App "
            "Password (not your login)? %s", settings.SMTP_USERNAME, e,
        )
        return False
    except Exception as e:
        logger.error("Email failed to %s: %s", to, e)
        return False


# ── HELPERS ──
def _fmt_date(value) -> str:
    return value.strftime("%A, %d %B %Y") if value else "—"


def _fmt_time(value) -> str:
    return value.strftime("%I:%M %p").lstrip("0") if value else "—"


def _pretty(value) -> str:
    if value is None:
        return "—"
    value = getattr(value, "value", value)   # unwrap enums → "cardiology", not "Specialization.CARDIOLOGY"
    return str(value).replace("_", " ").title()


# ── BASE TEMPLATE ──
BASE_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>{preheader}</title>
    <style>
        body {{ margin: 0; padding: 0; background: #F4F6F8; }}
        a {{ color: #1D4ED8; }}
        @media only screen and (max-width: 620px) {{
            .container {{ width: 100% !important; border-radius: 0 !important; }}
            .pad {{ padding: 24px !important; }}
            .code-value {{ font-size: 28px !important; letter-spacing: 6px !important; }}
        }}
    </style>
</head>
<body style="margin:0; padding:0; background:#F4F6F8; font-family: Arial, Helvetica, sans-serif;">
    <!-- preheader: shown in the inbox preview, hidden in the body -->
    <div style="display:none; font-size:1px; color:#F4F6F8; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
        {preheader}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F6F8;">
        <tr>
            <td align="center" style="padding: 32px 16px;">

                <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0"
                       style="width:600px; max-width:600px; background:#FFFFFF; border:1px solid #D9E0E7; border-radius:6px; overflow:hidden;">

                    <!-- HEADER -->
                    <tr>
                        <td style="background:#16324F; padding: 28px 32px; border-bottom: 3px solid #1D4ED8;">
                            <div style="color:#FFFFFF; font-size:20px; font-weight:bold; letter-spacing:0.5px;">
                                MedSync
                            </div>
                            <div style="color:#AFC3D6; font-size:13px; margin-top:4px;">
                                Your Health, Tracked
                            </div>
                        </td>
                    </tr>

                    <!-- CONTENT -->
                    <tr>
                        <td class="pad" style="padding: 32px; color:#202B36; font-size:15px; line-height:1.6;">
                            {content}
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="padding: 20px 32px; background:#F8FAFC; border-top:1px solid #D9E0E7;
                                   color:#667085; font-size:12px; line-height:1.5;">
                            This is an automated message from MedSync. Please do not reply to this email.
                            <div style="margin-top:6px;">&copy; 2026 MedSync</div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def _render(content: str, preheader: str = "") -> str:
    """Wrap email content in the base template."""
    return BASE_TEMPLATE.format(preheader=html.escape(preheader), content=content)


# Shared inline style fragments (kept in one place so the look stays consistent)
_BTN = (
    "display:inline-block; padding:12px 24px; background:#1D4ED8; color:#FFFFFF; "
    "text-decoration:none; border-radius:6px; font-weight:bold; font-size:14px;"
)
_H2 = "margin:0 0 16px; color:#16324F; font-size:19px;"
_STAT = ("background:#F8FAFC; border:1px solid #D9E0E7; border-left:3px solid #1D4ED8; "
         "padding:14px 16px; margin:12px 0; border-radius:0 4px 4px 0;")
_STAT_LABEL = "font-size:11px; color:#667085; text-transform:uppercase; letter-spacing:0.6px;"
_STAT_VALUE = "font-size:16px; font-weight:bold; color:#202B36; margin-top:3px;"
_MUTED = "color:#667085; font-size:13px;"


# ── ACCOUNT EMAILS ──

def send_welcome_email(user) -> bool:
    content = f"""
        <h2 style="{_H2}">Welcome to MedSync</h2>
        <p>Hello <strong>{html.escape(user.full_name)}</strong>,</p>
        <p>Your account is ready. Here is what you can do:</p>
        <div style="{_STAT}">
            <div style="{_STAT_VALUE}">Book appointments with doctors</div>
        </div>
        <div style="{_STAT}">
            <div style="{_STAT_VALUE}">Receive and scan prescriptions</div>
        </div>
        <div style="{_STAT}">
            <div style="{_STAT_VALUE}">Track your medications and adherence</div>
        </div>
        <p style="margin-top:24px;">Start by booking your first appointment.</p>
        <a href="{html.escape(settings.FRONTEND_URL)}" style="{_BTN}">Get started</a>
    """
    return send_email(user.email, "Welcome to MedSync", _render(content, "Your MedSync account is ready."))


def send_doctor_welcome_email(user) -> bool:
    """Welcome email for a doctor account created by an admin."""
    specialization = getattr(user.specialization, "value", user.specialization)
    specialization = html.escape(str(specialization).replace("_", " ").title())

    content = f"""
        <h2 style="{_H2}">Your {html.escape(settings.APP_NAME)} doctor account is ready</h2>
        <p>Hello Dr. <strong>{html.escape(user.full_name)}</strong>,</p>
        <p>An administrator has created your doctor account on {html.escape(settings.APP_NAME)}.</p>
        <div style="{_STAT}">
            <div style="{_STAT_LABEL}">Specialization</div>
            <div style="{_STAT_VALUE}">{specialization}</div>
        </div>
        <p>Sign in with your email address and the password your administrator set for you.
           If you do not have it, use <em>Forgot password</em> to reset it.</p>
        <a href="{html.escape(settings.FRONTEND_URL)}" style="{_BTN}">Sign in to {html.escape(settings.APP_NAME)}</a>
    """
    return send_email(
        user.email,
        f"Your {settings.APP_NAME} doctor account is ready",
        _render(content, "An administrator created a doctor account for you."),
    )


def send_otp_email(user, otp: str) -> bool:
    content = f"""
        <h2 style="{_H2}">Password reset code</h2>
        <p>Hello <strong>{html.escape(user.full_name)}</strong>,</p>
        <p>Use the code below to reset your password. It expires in
           <strong>{settings.OTP_EXPIRE_MINUTES} minutes</strong>.</p>
        <div style="background:#F8FAFC; border:1px solid #D9E0E7; border-radius:6px; padding:22px; margin:20px 0; text-align:center;">
            <div style="{_STAT_LABEL}">Your code</div>
            <div class="code-value" style="font-family: Consolas, Menlo, monospace; font-size:34px; font-weight:bold;
                        letter-spacing:8px; color:#16324F; margin-top:8px;">
                {html.escape(otp)}
            </div>
        </div>
        <p style="{_MUTED}">If you did not request this, you can safely ignore this email.</p>
    """
    return send_email(user.email, "Your MedSync password reset code",
                      _render(content, "Your password reset code is inside."))


# ── APPOINTMENT EMAILS ──

def send_appointment_booked_email(doctor, patient, appointment) -> bool:
    """Doctor is notified when a patient books."""
    content = f"""
        <h2 style="{_H2}">New appointment request</h2>
        <p>Hello Dr. <strong>{html.escape(doctor.full_name)}</strong>,</p>
        <p><strong>{html.escape(patient.full_name)}</strong> has booked an appointment with you.</p>
        <div style="{_STAT}">
            <div style="{_STAT_LABEL}">Patient</div>
            <div style="{_STAT_VALUE}">{html.escape(patient.full_name)}</div>
        </div>
        <div style="{_STAT}">
            <div style="{_STAT_LABEL}">Date &amp; time</div>
            <div style="{_STAT_VALUE}">{_fmt_date(appointment.appointment_date)} — {_fmt_time(appointment.appointment_time)}</div>
        </div>
        <div style="{_STAT}">
            <div style="{_STAT_LABEL}">Reason</div>
            <div style="{_STAT_VALUE}">{html.escape(appointment.reason or "—")}</div>
        </div>
        <a href="{html.escape(settings.FRONTEND_URL)}" style="{_BTN}">Review request</a>
    """
    return send_email(
        doctor.email,
        f"New appointment request from {patient.full_name}",
        _render(content, f"{patient.full_name} booked an appointment with you."),
    )


_STATUS_COPY = {
    "pending":   ("Appointment pending",   "is <strong>pending</strong> confirmation"),
    "confirmed": ("Appointment confirmed", "has been <strong>confirmed</strong>"),
    "completed": ("Appointment completed", "is <strong>complete</strong>"),
    "cancelled": ("Appointment cancelled", "has been <strong>cancelled</strong>"),
}


def send_appointment_status_email(patient, appointment, doctor, new_status) -> bool:
    """Patient is notified whenever the doctor changes the status."""
    key = str(getattr(new_status, "value", new_status)).lower()
    heading, sentence = _STATUS_COPY.get(
        key, ("Appointment updated", f"is now <strong>{html.escape(_pretty(key))}</strong>")
    )

    # Status colour, plus the word itself so meaning never depends on colour alone
    if key == "cancelled":
        badge_bg, badge_fg = "#FDECEC", "#C62828"
    elif key == "completed":
        badge_bg, badge_fg = "#EAF5EC", "#2E7D32"
    elif key == "confirmed":
        badge_bg, badge_fg = "#E8EFFD", "#1D4ED8"
    else:
        badge_bg, badge_fg = "#F1F3F6", "#667085"

    content = f"""
        <h2 style="{_H2}">{heading}</h2>
        <p>Hello <strong>{html.escape(patient.full_name)}</strong>,</p>
        <p>Your appointment with Dr. <strong>{html.escape(doctor.full_name)}</strong> {sentence}.</p>
        <div style="display:inline-block; padding:5px 12px; border-radius:4px; background:{badge_bg};
                    color:{badge_fg}; font-size:12px; font-weight:bold; text-transform:uppercase;
                    letter-spacing:0.6px; margin-bottom:4px;">
            {html.escape(key)}
        </div>
        <div style="{_STAT}">
            <div style="{_STAT_LABEL}">Date &amp; time</div>
            <div style="{_STAT_VALUE}">{_fmt_date(appointment.appointment_date)} — {_fmt_time(appointment.appointment_time)}</div>
        </div>
        <div style="{_STAT}">
            <div style="{_STAT_LABEL}">Reason</div>
            <div style="{_STAT_VALUE}">{html.escape(appointment.reason or "—")}</div>
        </div>
        <a href="{html.escape(settings.FRONTEND_URL)}" style="{_BTN}">View appointment</a>
    """
    return send_email(patient.email, heading, _render(content, f"Your appointment is now {key}."))


def send_appointment_cancelled_doctor_email(doctor, patient, appointment) -> bool:
    """Doctor is notified when the patient cancels."""
    content = f"""
        <h2 style="{_H2}">Appointment cancelled</h2>
        <p>Hello Dr. <strong>{html.escape(doctor.full_name)}</strong>,</p>
        <p><strong>{html.escape(patient.full_name)}</strong> has cancelled their appointment.</p>
        <div style="{_STAT}">
            <div style="{_STAT_LABEL}">Date &amp; time</div>
            <div style="{_STAT_VALUE}">{_fmt_date(appointment.appointment_date)} — {_fmt_time(appointment.appointment_time)}</div>
        </div>
        <div style="{_STAT}">
            <div style="{_STAT_LABEL}">Original reason</div>
            <div style="{_STAT_VALUE}">{html.escape(appointment.reason or "—")}</div>
        </div>
    """
    return send_email(
        doctor.email,
        f"{patient.full_name} cancelled their appointment",
        _render(content, f"{patient.full_name} cancelled an appointment with you."),
    )


# ── PRESCRIPTION EMAILS ──

def send_prescription_ready_email(patient, prescription) -> bool:
    content = f"""
        <h2 style="{_H2}">Prescription ready</h2>
        <p>Hello <strong>{html.escape(patient.full_name)}</strong>,</p>
        <p>Your prescription is ready. Open MedSync to view it and present the QR
           code at the pharmacy.</p>
        <a href="{html.escape(settings.FRONTEND_URL)}" style="{_BTN}">View prescription</a>
    """
    return send_email(patient.email, "Your prescription is ready",
                      _render(content, "Your prescription is ready to view."))


# ── MEDICATION EMAILS ──

def send_medication_reminder_email(patient, medication) -> bool:
    content = f"""
        <h2 style="{_H2}">Medication reminder</h2>
        <p>Hello <strong>{html.escape(patient.full_name)}</strong>,</p>
        <p>It is time to take your medication:</p>
        <div style="{_STAT}">
            <div style="{_STAT_LABEL}">Drug</div>
            <div style="{_STAT_VALUE}">{html.escape(medication.drug_name)}</div>
        </div>
        <div style="{_STAT}">
            <div style="{_STAT_LABEL}">Dosage</div>
            <div style="{_STAT_VALUE}">{html.escape(medication.dosage)}</div>
        </div>
        <div style="{_STAT}">
            <div style="{_STAT_LABEL}">Frequency</div>
            <div style="{_STAT_VALUE}">{_pretty(medication.frequency)}</div>
        </div>
        <p style="margin-top:20px;">Record it in the app to keep your adherence streak.</p>
        <a href="{html.escape(settings.FRONTEND_URL)}" style="{_BTN}">Mark as taken</a>
    """
    return send_email(
        patient.email,
        f"Medication reminder: {medication.drug_name}",
        _render(content, f"Time to take {medication.drug_name}."),
    )


def send_medication_completion_email(patient, medication) -> bool:
    content = f"""
        <h2 style="{_H2}">Course completed</h2>
        <p>Hello <strong>{html.escape(patient.full_name)}</strong>,</p>
        <p>You have completed your course of <strong>{html.escape(medication.drug_name)}</strong>.</p>
        <div style="{_STAT}">
            <div style="{_STAT_LABEL}">Medication</div>
            <div style="{_STAT_VALUE}">{html.escape(medication.drug_name)}</div>
        </div>
        <p>Review your adherence history in MedSync.</p>
        <a href="{html.escape(settings.FRONTEND_URL)}" style="{_BTN}">View history</a>
    """
    return send_email(
        patient.email,
        f"Course completed: {medication.drug_name}",
        _render(content, f"You completed your course of {medication.drug_name}."),
    )
