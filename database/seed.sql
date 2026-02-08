-- Seed Cameras
INSERT INTO cameras (model_name, serial_number, purchase_date, initial_shutter_count, current_shutter_count)
VALUES 
    ('Sony A7III', 'S123456789', '2025-01-15', 0, 5000),
    ('Canon R6', 'C987654321', '2024-11-20', 10000, 12500)
ON CONFLICT (serial_number) DO NOTHING;

-- Seed Users (Password: 'password' hashed with bcrypt for example purposes, in real app use app to hash)
-- This is just a placeholder, the app should create the first admin via CLI or API.
INSERT INTO users (username, email, password_hash, role)
VALUES 
    ('admin', 'admin@example.com', '$2b$12$K.zG8.y...hash...placeholder', 'admin'),
    ('photo1', 'photo@example.com', '$2b$12$K.zG8.y...hash...placeholder', 'photographer')
ON CONFLICT (username) DO NOTHING;
