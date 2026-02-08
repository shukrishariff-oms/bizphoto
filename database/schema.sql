-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (Admin & Photographer)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'photographer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cameras Table
CREATE TABLE IF NOT EXISTS cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    purchase_date DATE,
    initial_shutter_count INTEGER DEFAULT 0,
    current_shutter_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    event_date DATE NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    -- Financial fields are calculated via SP, we can store cached values or compute on fly.
    -- For this design, we'll store cached totals for fast dashboard retrieval, 
    -- updated via triggers/SP.
    -- total_cost DECIMAL(10, 2) DEFAULT 0.00,
    -- net_profit DECIMAL(10, 2) DEFAULT 0.00
);

-- Event Costs Table
CREATE TABLE IF NOT EXISTS event_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    cost_type VARCHAR(50) NOT NULL, -- 'transport', 'food', 'editing', 'ads', 'other'
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Camera Usage per Event
CREATE TABLE IF NOT EXISTS camera_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    camera_id UUID REFERENCES cameras(id),
    shutter_count_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_costs_event_id ON event_costs(event_id);
CREATE INDEX IF NOT EXISTS idx_camera_usage_event_id ON camera_usage(event_id);
CREATE INDEX IF NOT EXISTS idx_camera_usage_camera_id ON camera_usage(camera_id);
