
```markdown
# MedSync

A full-stack healthcare coordination platform that connects patients, clinicians, and administrators. Built with FastAPI, PostgreSQL, and a modern HTML/CSS frontend.

## About

MedSync bridges the gap between clinic visits and daily patient follow-through. Patients book appointments, receive prescriptions with secure QR codes, and track their medication progress. Clinicians manage appointments and issue digital prescriptions. Administrators oversee clinic activity and user management.

> **Not for emergencies.** If you need urgent medical help, contact your local emergency services immediately.

---

## Features

### For Patients
- Register and manage your account
- Book appointments with available clinicians
- View prescriptions and scan QR codes to auto-create medication schedules
- Log daily medication doses and track streaks
- Receive email reminders for upcoming doses
- Reset forgotten passwords via OTP

### For Clinicians
- Review and manage appointment requests
- Confirm, complete, or cancel appointments
- Issue digital prescriptions with auto-generated QR codes
- Monitor patient medication compliance

### For Administrators
- Register and manage clinician accounts
- View clinic-wide statistics
- Manage patient and clinician accounts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python 3.13 |
| Database | PostgreSQL + SQLAlchemy |
| Authentication | JWT (access + refresh tokens) |
| Password Reset | OTP via email |
| Email | Resend API |
| Image Storage | Cloudinary |
| Drug Reference | OpenFDA API |
| QR Codes | qrcode library |
| Scheduling | APScheduler |
| Caching | Redis |
| Rate Limiting | SlowAPI |
| Frontend | HTML, CSS, JavaScript |

---

## Project Structure

```
MedSync/
├── main.py
├── database.py
├── models.py
├── schemas.py
├── crud.py
├── enums.py
├── .env
├── core/
│   ├── config.py
│   ├── security.py
│   └── dependencies.py
├── api/v1/
│   ├── router.py
│   └── endpoints/
│       ├── auth.py
│       ├── appointments.py
│       ├── prescriptions.py
│       ├── medications.py
│       ├── logs.py
│       ├── drugs.py
│       └── admin.py
└── services/
    ├── email.py
    ├── scheduler.py
    └── cache.py
```

---

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/daramz34/medsync.git
cd MedSync
```

### 2. Create virtual environment
```bash
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Create `.env` file
```env
DATABASE_URL=postgresql://username:password@localhost/medsync_db
SECRET_KEY=your-secret-key-minimum-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

RESEND_API_KEY=your_resend_api_key
SENDER_EMAIL=your@email.com

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

REDIS_URL=redis://localhost:6379

APP_NAME=MedSync
VERSION=1.0.0
```

### 5. Run the API
```bash
uvicorn main:app --reload
```

### 6. Visit docs
```
http://localhost:8000/docs
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Register patient | No |
| POST | `/api/v1/auth/login` | Login | No |
| POST | `/api/v1/auth/refresh` | Refresh access token | No |
| POST | `/api/v1/auth/logout` | Revoke refresh token | Yes |
| POST | `/api/v1/auth/forgot-password` | Send OTP | No |
| POST | `/api/v1/auth/reset-password` | Reset with OTP | No |
| POST | `/api/v1/auth/change-password` | Change password | Yes |
| GET | `/api/v1/auth/me` | Current user | Yes |
| PUT | `/api/v1/auth/me` | Update profile | Yes |
| POST | `/api/v1/auth/me/picture` | Upload profile picture | Yes |

### Appointments
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/appointments/` | Book appointment | Patient |
| GET | `/api/v1/appointments/` | My appointments | Yes |
| GET | `/api/v1/appointments/doctors` | List all doctors | No |
| GET | `/api/v1/appointments/{id}` | Single appointment | Yes |
| PATCH | `/api/v1/appointments/{id}` | Update status/notes | Doctor |
| DELETE | `/api/v1/appointments/{id}` | Cancel appointment | Patient |

### Prescriptions
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/prescriptions/` | Create prescription + QR | Doctor |
| GET | `/api/v1/prescriptions/` | My prescriptions | Patient |
| GET | `/api/v1/prescriptions/{id}` | Single prescription | Yes |
| POST | `/api/v1/prescriptions/scan` | Scan QR code | Patient |
| POST | `/api/v1/prescriptions/{id}/revoke-qr` | Revoke QR | Doctor |

### Medications
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/medications/` | Add medication manually | Patient |
| GET | `/api/v1/medications/` | My medications | Patient |
| GET | `/api/v1/medications/{id}` | Single medication | Patient |
| PATCH | `/api/v1/medications/{id}` | Update reminder/status | Patient |
| DELETE | `/api/v1/medications/{id}` | Delete medication | Patient |

### Logs & Streaks
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/logs/` | Log dose | Patient |
| GET | `/api/v1/logs/today` | Today's logs | Patient |
| GET | `/api/v1/logs/{medication_id}` | Log history | Patient |
| GET | `/api/v1/logs/streaks/{medication_id}` | Streak stats | Patient |

### Drugs
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/drugs/search` | Search OpenFDA | Yes |
| GET | `/api/v1/drugs/{id}` | Cached drug info | Yes |

### Admin
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/admin/stats` | Clinic statistics | Admin |
| GET | `/api/v1/admin/patients` | All patients | Admin |
| GET | `/api/v1/admin/doctors` | All doctors | Admin |
| POST | `/api/v1/admin/doctors` | Register doctor | Admin |
| DELETE | `/api/v1/admin/users/{id}` | Remove user | Admin |

---

## Care Flow

```
Patient registers
        ↓
Books appointment with a clinician
        ↓
Doctor confirms appointment
        ↓
After visit — doctor issues prescription + QR code
        ↓
Patient scans QR → medication schedule auto-created
        ↓
Patient logs daily doses → streak tracked
        ↓
Email reminders sent at scheduled times
        ↓
Course completes → completion email sent
```

---

## Security

- JWT access tokens (15 min expiry)
- Refresh tokens stored as hashed values (7 day expiry)
- OTP-based password reset (10 min expiry)
- QR tokens stored as SHA-256 hashes — raw token never stored
- Role-based access control (Patient, Doctor, Admin)
- bcrypt password hashing (10 rounds)
- Rate limiting on auth endpoints
- Security headers on all responses

---

## Future Improvements

- Pharmacy role — scan QR to verify and dispense drugs
- Mobile app (React Native)
- WebSocket notifications for appointment status changes
- Telemedicine / video consultation booking
- Multi-clinic support
- Patient allergy tracking
- Drug interaction warnings

---

## Author

**Oluwadarasimi Rotimi**
GitHub: https://github.com/daramz34
LinkedIn: https://www.linkedin.com/in/oluwadarasimi-rotimi-40007a420/
```

Save as `README.md` in your project root.