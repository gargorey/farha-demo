/**
 * Database schema, applied in order by `npm run db:migrate` (and on server start).
 * Never edit a migration that has shipped: add a new one.
 */
export const migrations: { id: string; sql: string }[] = [
  {
    id: '001_init',
    sql: /* sql */ `
      -- Business settings (VAT, travel fees, lead time, policy windows). One row.
      CREATE TABLE settings (
        id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        data jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE cities (
        id text PRIMARY KEY,
        name jsonb NOT NULL,
        region jsonb NOT NULL,
        sort_order int NOT NULL DEFAULT 0
      );

      CREATE TABLE event_types (
        id text PRIMARY KEY,
        name jsonb NOT NULL,
        icon text NOT NULL,
        sort_order int NOT NULL DEFAULT 0
      );

      CREATE TABLE categories (
        id text PRIMARY KEY,
        slug text NOT NULL UNIQUE,
        sort_order int NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true,
        data jsonb NOT NULL  -- name, description, motif
      );

      CREATE TABLE providers (
        id text PRIMARY KEY,
        status text NOT NULL CHECK (status IN ('active', 'pending', 'suspended')),
        commission_rate numeric(5, 4) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 1),
        data jsonb NOT NULL, -- name, contactName, phone, email, cityIds, joinedAt, notes
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE services (
        id text PRIMARY KEY,
        slug text NOT NULL UNIQUE,
        category_id text NOT NULL REFERENCES categories (id),
        provider_id text NOT NULL REFERENCES providers (id),
        active boolean NOT NULL DEFAULT true,
        data jsonb NOT NULL, -- the public Service shape (packages, add-ons, texts…)
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX services_category_idx ON services (category_id);
      CREATE INDEX services_provider_idx ON services (provider_id);

      -- Personal data (PDPL): keep to what bookings need; staff access is audited.
      CREATE TABLE customers (
        id text PRIMARY KEY,
        full_name text NOT NULL,
        phone text NOT NULL UNIQUE, -- E.164
        email text NOT NULL,
        city_id text,
        tags text[] NOT NULL DEFAULT '{}',
        notes text,
        blocked boolean NOT NULL DEFAULT false,
        source text NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'staff', 'import')),
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX customers_email_idx ON customers (lower(email));

      CREATE TABLE bookings (
        id text PRIMARY KEY,
        reference text NOT NULL UNIQUE,
        status text NOT NULL CHECK (status IN ('draft', 'pending_request', 'pending_confirmation', 'confirmed',
                                               'completed', 'cancellation_requested', 'cancelled')),
        customer_id text NOT NULL REFERENCES customers (id),
        service_id text NOT NULL REFERENCES services (id),
        event_date date NOT NULL,
        start_time text NOT NULL,
        duration_minutes int NOT NULL,
        city_id text NOT NULL,
        channel text NOT NULL DEFAULT 'website' CHECK (channel IN ('website', 'whatsapp', 'phone')),
        origin text NOT NULL DEFAULT 'website' CHECK (origin IN ('website', 'sample')),
        total numeric(12, 2) NOT NULL,
        selection jsonb NOT NULL,
        event jsonb NOT NULL,
        customer jsonb NOT NULL, -- contact details as given on this booking
        pricing jsonb NOT NULL,  -- breakdown computed by the server
        history jsonb NOT NULL DEFAULT '[]',
        modification_request jsonb,
        internal_notes jsonb NOT NULL DEFAULT '[]',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX bookings_customer_idx ON bookings (customer_id);
      CREATE INDEX bookings_service_date_idx ON bookings (service_id, event_date);
      CREATE INDEX bookings_event_date_idx ON bookings (event_date);
      CREATE INDEX bookings_status_idx ON bookings (status);
      CREATE INDEX bookings_created_idx ON bookings (created_at DESC);

      -- Retried POST /bookings with the same key returns the same booking.
      CREATE TABLE idempotency_keys (
        key text PRIMARY KEY,
        fingerprint text NOT NULL,
        booking_id text NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE promotions (
        id text PRIMARY KEY,
        code text NOT NULL,
        active boolean NOT NULL DEFAULT true,
        data jsonb NOT NULL
      );
      CREATE UNIQUE INDEX promotions_code_idx ON promotions (upper(code));

      CREATE TABLE staff_users (
        id text PRIMARY KEY,
        name text NOT NULL,
        email text NOT NULL,
        role text NOT NULL CHECK (role IN ('admin', 'operations', 'finance', 'viewer')),
        active boolean NOT NULL DEFAULT true,
        password_hash text,            -- scrypt; NULL = cannot sign in
        must_change_password boolean NOT NULL DEFAULT true,
        failed_logins int NOT NULL DEFAULT 0,
        locked_until timestamptz,
        last_active_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX staff_users_email_idx ON staff_users (lower(email));

      -- Sessions store only a SHA-256 hash of the cookie token.
      CREATE TABLE staff_sessions (
        token_hash text PRIMARY KEY,
        staff_id text NOT NULL REFERENCES staff_users (id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        last_seen_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL
      );
      CREATE INDEX staff_sessions_staff_idx ON staff_sessions (staff_id);

      CREATE TABLE customer_sessions (
        token_hash text PRIMARY KEY,
        verified_phone text,                       -- set after a correct one-time code
        booking_ids text[] NOT NULL DEFAULT '{}',  -- bookings made in this browser session
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL
      );

      CREATE TABLE otp_challenges (
        id bigserial PRIMARY KEY,
        phone text NOT NULL,
        code_hash text NOT NULL,
        attempts int NOT NULL DEFAULT 0,
        expires_at timestamptz NOT NULL,
        consumed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX otp_phone_idx ON otp_challenges (phone, created_at DESC);

      CREATE TABLE audit_log (
        id bigserial PRIMARY KEY,
        at timestamptz NOT NULL DEFAULT now(),
        actor_id text,
        actor_name text NOT NULL,
        action text NOT NULL,
        target text NOT NULL,
        detail text
      );
      CREATE INDEX audit_log_at_idx ON audit_log (at DESC);

      CREATE TABLE contact_messages (
        id text PRIMARY KEY,
        name text NOT NULL,
        email text NOT NULL,
        phone text,
        subject text NOT NULL,
        message text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `,
  },
];
