-- Create additional databases or users if needed
CREATE DATABASE IF NOT EXISTS kozi_chatbot;
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY 'root';
GRANT ALL PRIVILEGES ON kozi_chatbot.* TO 'root'@'%';
FLUSH PRIVILEGES;