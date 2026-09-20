-- Each microservice owns its own database/schema. No tables are shared
-- across services; every service also has createDatabaseIfNotExist=true
-- in its own JDBC URL as a second line of defense, but creating them here
-- up front keeps the first boot deterministic.
CREATE DATABASE IF NOT EXISTS auth_db CHARACTER SET utf8mb4;
CREATE DATABASE IF NOT EXISTS user_db CHARACTER SET utf8mb4;
CREATE DATABASE IF NOT EXISTS case_db CHARACTER SET utf8mb4;
CREATE DATABASE IF NOT EXISTS notification_db CHARACTER SET utf8mb4;
