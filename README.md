# Nysa Biomed Pvt. Ltd. — BMR/BPR Controlled Document Issuance & Printing System

A modern, full-stack, enterprise-grade Batch Manufacturing Record (BMR) and Batch Packing Record (BPR) controlled issuance, electronic mapping, and print management web application designed for pharmaceutical manufacturing operations.

---

## 🌟 Key Features

### 🏭 1. Controlled Issuance & Requisition Workflow
- **Production Requisitions**: Production operators submit BMR/BPR document requests for specific batch numbers and products.
- **QA/Admin Approval & Issuance**: QA Leads review, approve, auto-number, and issue controlled documents.
- **Role-Based Workflows**: Strictly segregated roles (`QA_ADMIN`, `PRODUCTION`).

### 📝 2. Interactive Sejda PDF Mapping & Stamping Engine
- **Preset Field Auto-Mapping**: Automatic coordinate mapping for Batch Number, Mfg Date, Exp Date, Issued By, Issued Date, and Received By across all 78+ pages of BMR/BPR records.
- **Custom Field Support**: QA Admins can click anywhere on the PDF page in *Manual Field Mapping Mode* to add custom text boxes with dynamic font sizes, bold weight, font family, drag, and resize capabilities.
- **Scanned PDF Rotation Engine**: Universal handling for 0°, 90°, 180°, and 270° rotated scanned PDF pages using `pdfjs-dist`.

### 🖨️ 3. Canvas-Based Pixel-Perfect Print Engine
- **Same-Window Printing**: High-resolution (2x) canvas compositing pipeline guarantees that printed documents match the on-screen ViewModal 1:1 with zero vertical displacement or upside-down text.
- **Print Lock & Controlled Single-Print**: Documents are locked after a single print (1/1 used).
- **Reprint Request & Approval**: Production operators must request reprint authorization from QA Admin if additional prints are required.

### 📊 4. Real-time Audit Logs & Metrics Dashboard
- Complete audit trails recording document creation, issuance, print executions, and reprint approvals with timestamps, user IDs, and role signatures.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), TailwindCSS / Vanilla CSS Glassmorphism design system, Lucide React icons, `pdfjs-dist`.
- **Backend**: Node.js, Express.js, PostgreSQL (`pg` pool) with automatic disk fallback store (`fallback_store.json`), `pdf-lib`.
- **Database**: PostgreSQL database with local JSON persistence for offline resilience.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- PostgreSQL (Optional — automatic fallback to disk store if offline)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/malhar2005web/NYSA_PDF.git
   cd NYSA_PDF
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

---

## 🏃 Running the Application

### Option A: Run Backend & Frontend Concurrently

1. **Start Backend Server** (Port 5000)
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend Dev Server** (Port 5173)
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Application**
   Open your browser and navigate to `http://localhost:5173/`

---

## 👥 Default Test Accounts

| Role | Username / Email | Password | Permissions |
|---|---|---|---|
| **QA / Admin Lead** | `qa_admin` / `dr.rajesh@nysabiomed.com` | `admin123` | Upload, edit coordinates, add custom fields, issue documents, approve reprint requests, audit logs |
| **Production Officer** | `production` / `amit.verma@nysabiomed.com` | `prod123` | Request BMR/BPR, view assigned documents, execute single-controlled print, request reprint approval |

---

## 📂 Project Structure

```
NYSA_PDF/
├── backend/
│   ├── controllers/         # Document, Requisition, Print & Audit controllers
│   ├── db/                  # PostgreSQL connection pool & fallback local store
│   ├── routes/              # Express API endpoints
│   ├── services/            # pdf-lib stamper and audit services
│   ├── uploads/             # Originals & issued PDF document storage
│   ├── server.js            # Express application entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # PDFSejdaEditor, PDFSejdaStage, DocumentViewerModal, UploadModal, etc.
│   │   ├── context/         # AuthContext
│   │   ├── pages/           # QADashboard, ProductionDashboard, Login
│   │   ├── utils/           # Preset coordinate maps for BMR & BPR
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── README.md
└── .gitignore
```

---

## 📄 License

Internal Controlled Document Software — **Nysa Biomed Private Limited, Satara**. All rights reserved.
