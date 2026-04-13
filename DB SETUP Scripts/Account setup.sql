-- Check if user exists
SELECT usename, usecreatedb, usesuper 
FROM pg_user 
WHERE usename = 'hikcentral_user';

-- If user exists, reset the password
ALTER USER hikcentral_user WITH PASSWORD '!Peacethin70';

-- If user doesn't exist, create it
CREATE USER hikcentral_user WITH PASSWORD '!Peacethin70' LOGIN;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE hikcentral TO hikcentral_user;

-- Connect to hikcentral database and grant schema privileges
\c hikcentral
GRANT ALL PRIVILEGES ON SCHEMA public TO hikcentral_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hikcentral_user;