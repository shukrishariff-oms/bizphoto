-- Function to create an event
CREATE OR REPLACE FUNCTION sp_create_event(
    p_name VARCHAR,
    p_date DATE,
    p_description TEXT,
    p_base_price DECIMAL
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO events (name, event_date, description, base_price)
    VALUES (p_name, p_date, p_description, p_base_price)
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add cost to an event
CREATE OR REPLACE FUNCTION sp_add_event_cost(
    p_event_id UUID,
    p_cost_type VARCHAR,
    p_amount DECIMAL,
    p_description TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO event_costs (event_id, cost_type, amount, description)
    VALUES (p_event_id, p_cost_type, p_amount, p_description);
END;
$$ LANGUAGE plpgsql;

-- Function to register camera usage
CREATE OR REPLACE FUNCTION sp_register_camera_usage(
    p_event_id UUID,
    p_camera_id UUID,
    p_shutter_count INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Record usage
    INSERT INTO camera_usage (event_id, camera_id, shutter_count_used)
    VALUES (p_event_id, p_camera_id, p_shutter_count);
    
    -- Update cumulative count on camera
    UPDATE cameras
    SET current_shutter_count = current_shutter_count + p_shutter_count
    WHERE id = p_camera_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate financial summary for an event
CREATE OR REPLACE FUNCTION sp_get_event_financials(p_event_id UUID)
RETURNS TABLE (
    event_id UUID,
    event_name VARCHAR,
    base_revenue DECIMAL,
    total_cost DECIMAL,
    net_profit DECIMAL,
    profit_margin DECIMAL
) AS $$
DECLARE
    v_revenue DECIMAL(10, 2);
    v_cost DECIMAL(10, 2);
    v_profit DECIMAL(10, 2);
    v_margin DECIMAL(5, 2);
    v_name VARCHAR;
BEGIN
    -- Get Revenue (Base Price)
    SELECT base_price, name INTO v_revenue, v_name
    FROM events WHERE id = p_event_id;
    
    -- Calculate Total Costs
    SELECT COALESCE(SUM(amount), 0) INTO v_cost
    FROM event_costs WHERE event_costs.event_id = p_event_id;
    
    -- Formulas
    v_profit := v_revenue - v_cost;
    
    IF v_revenue > 0 THEN
        v_margin := (v_profit / v_revenue) * 100;
    ELSE
        v_margin := 0;
    END IF;
    
    RETURN QUERY SELECT 
        p_event_id, 
        v_name, 
        v_revenue, 
        v_cost, 
        v_profit, 
        v_margin;
END;
$$ LANGUAGE plpgsql;

-- Function for Monthly Aggregation
CREATE OR REPLACE FUNCTION sp_get_monthly_summary(
    p_year INTEGER,
    p_month INTEGER
)
RETURNS TABLE (
    total_revenue DECIMAL,
    total_expenses DECIMAL,
    total_profit DECIMAL,
    event_count INTEGER
) AS $$
DECLARE
    start_date DATE := make_date(p_year, p_month, 1);
    end_date DATE := (start_date + interval '1 month' - interval '1 day')::date;
BEGIN
    RETURN QUERY
    WITH monthly_events AS (
        SELECT id, base_price FROM events 
        WHERE event_date BETWEEN start_date AND end_date
    ),
    monthly_costs AS (
        SELECT COALESCE(SUM(amount), 0) as cost
        FROM event_costs 
        WHERE event_id IN (SELECT id FROM monthly_events)
    )
    SELECT 
        COALESCE(SUM(me.base_price), 0) as total_revenue,
        (SELECT cost FROM monthly_costs) as total_expenses,
        (COALESCE(SUM(me.base_price), 0) - (SELECT cost FROM monthly_costs)) as total_profit,
        COUNT(me.id)::INTEGER as event_count
    FROM monthly_events me;
END;
$$ LANGUAGE plpgsql;
