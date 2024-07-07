-- init.sql

CREATE OR REPLACE FUNCTION update_token_usage() RETURNS TRIGGER AS $$
BEGIN
    -- Update the current_tokens_used in the bot table
    UPDATE bot
    SET current_tokens_used = current_tokens_used + NEW.tokens_used
    WHERE id = NEW.bot_id;

    -- Check if the token limit is reached or exceeded
    IF (SELECT current_tokens_used FROM bot WHERE id = NEW.bot_id) >= (SELECT token_limit FROM bot WHERE id = NEW.bot_id) THEN
        -- Update the bot status to 'inactive'
        UPDATE bot
        SET status = 'inactive'
        WHERE id = NEW.bot_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_token_usage_trigger
AFTER INSERT ON records
FOR EACH ROW
EXECUTE FUNCTION update_token_usage();