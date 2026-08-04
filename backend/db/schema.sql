-- Enterprise PostgreSQL DDL Schema for Pharmaceutical BMR/BPR Controlled Document System

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('QA_ADMIN', 'PRODUCTION')),
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) DEFAULT 'Quality Assurance',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    issuance_number VARCHAR(100) UNIQUE NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('BMR', 'BPR')),
    batch_number VARCHAR(100) NOT NULL,
    mfg_date VARCHAR(50) NOT NULL,
    expiry_date VARCHAR(50) NOT NULL,
    issued_by VARCHAR(255) NOT NULL,
    issued_date VARCHAR(50) NOT NULL,
    received_by VARCHAR(255) DEFAULT '',
    file_path VARCHAR(500) NOT NULL,
    stamped_file_path VARCHAR(500),
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT DEFAULT 0,
    page_count INT DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('DRAFT', 'ISSUED', 'PRINTED', 'REPRINT_PENDING', 'REPRINT_APPROVED')),
    print_count INT DEFAULT 0,
    allowed_prints INT DEFAULT 1,
    uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_assignments (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    assigned_to INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by INT REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS print_logs (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    printed_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    print_type VARCHAR(50) NOT NULL DEFAULT 'ORIGINAL' CHECK (print_type IN ('ORIGINAL', 'REPRINT')),
    reprint_request_id INT,
    ip_address VARCHAR(100) DEFAULT '127.0.0.1',
    printed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reprint_requests (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    requested_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
    review_reason TEXT DEFAULT '',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    recipient_id INT REFERENCES users(id) ON DELETE CASCADE,
    recipient_role VARCHAR(50) CHECK (recipient_role IN ('QA_ADMIN', 'PRODUCTION', 'ALL')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(100) NOT NULL,
    document_id INT REFERENCES documents(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    document_id INT REFERENCES documents(id) ON DELETE SET NULL,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(255) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    issuance_number VARCHAR(100) NOT NULL,
    details TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for scalable query performance
CREATE INDEX IF NOT EXISTS idx_documents_issuance_number ON documents(issuance_number);
CREATE INDEX IF NOT EXISTS idx_documents_batch_number ON documents(batch_number);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_assignments_assigned_to ON document_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
