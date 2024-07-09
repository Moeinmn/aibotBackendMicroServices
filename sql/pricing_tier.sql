-- Create the pricing_tier table if it doesn't exist
CREATE TABLE IF NOT EXISTS pricing_tier (
    id INT PRIMARY KEY,
    tier_name VARCHAR(255),
    price INT,
    bot_count INT,
    context_limit INT,
    token_limit INT,
    storage_limit INT
);

-- Insert records if they do not exist
INSERT INTO pricing_tier (id, tier_name, price, bot_count, context_limit, token_limit, storage_limit)
SELECT 0, 'free', 100000, 2, 8192, 1600000, 1000
WHERE NOT EXISTS (SELECT 1 FROM pricing_tier WHERE id = 0);

INSERT INTO pricing_tier (id, tier_name, price, bot_count, context_limit, token_limit, storage_limit)
SELECT 1, 'pro', 200000, 5, 16385, 16000000, 1000
WHERE NOT EXISTS (SELECT 1 FROM pricing_tier WHERE id = 1);

INSERT INTO pricing_tier (id, tier_name, price, bot_count, context_limit, token_limit, storage_limit)
SELECT 2, 'enterprise', 300000, 10, 16385, 32000000, 1000
WHERE NOT EXISTS (SELECT 1 FROM pricing_tier WHERE id = 2);

INSERT INTO pricing_tier (id, tier_name, price, bot_count, context_limit, token_limit, storage_limit)
SELECT 3, 'cusrom_a', 111, 22, 333, 444, 555
WHERE NOT EXISTS (SELECT 1 FROM pricing_tier WHERE id = 3);
