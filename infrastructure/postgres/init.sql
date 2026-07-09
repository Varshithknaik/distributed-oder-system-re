CREATE DATABASE order_db;
CREATE DATABASE inventory_db;
CREATE DATABASE payment_db;

\c order_db;
CREATE TABLE orders (id UUID PRIMARY KEY, user_id VARCHAR(50), total DECIMAL, status VARCHAR(20));

\c inventory_db;
CREATE TABLE inventory (sku VARCHAR(50) PRIMARY KEY, stock INT);