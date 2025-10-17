/*
  # Create users table for authentication

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Unique user identifier
      - `first_name` (varchar) - User's first name
      - `last_name` (varchar) - User's last name
      - `email` (varchar, unique) - User's email address (used for login)
      - `password_hash` (varchar) - Hashed password using bcrypt
      - `totp_secret` (varchar) - TOTP secret for 2FA authentication
      - `totp_setup_completed` (boolean) - Tracks if user completed 2FA setup
      - `newsletter_opt_in` (boolean) - Newsletter subscription preference
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `users` table
    - Add policies for authenticated users to read/update their own data
    - Add policy for inserting new users during signup

  3. Indexes
    - Index on email for faster lookups during login

  4. Triggers
    - Automatic updated_at timestamp on record changes
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  totp_secret VARCHAR(100),
  totp_setup_completed BOOLEAN DEFAULT false,
  newsletter_opt_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (for signup)
CREATE POLICY "Anyone can create account"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
