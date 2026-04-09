# GrainHero Backend Migration Prompt for Lovable

***Copy and paste the text below into Lovable to begin the backend migration process.***

---

## CONTEXT & GOAL
I am migrating my entire custom Node.js & MongoDB backend to **Supabase**. You (Lovable) will design and implement the complete backend architecture exclusively using Supabase services (Database, Auth, Storage, Realtime, and Edge Functions). 

I am keeping my Next.js 15 frontend deployed separately on Vercel. Your focus is strictly on building out the Supabase backend configuration, database schema, Edge Functions for business logic (Stripe, AI/ML, IoT), and providing me with the Supabase client implementation logic needed for my frontend.

## SYSTEM ARCHITECTURE OVERVIEW
- **Database**: Supabase PostgreSQL (replacing MongoDB).
- **Authentication**: Supabase Auth (replacing custom JWT/bcrypt). 
- **Storage**: Supabase Storage (replacing Cloudinary).
- **Real-time**: Supabase Realtime & Edge Functions (replacing Firebase Realtime Database & MQTT).
- **Payments**: Stripe Webhooks handled via Supabase Edge Functions.
- **AI/ML**: Spoilage prediction Python models executed via an external API or wrapped in a Deno Edge Function (if feasible using ONNX or API calls).
- **Multi-tenancy**: Strict Row Level Security (RLS) policies to enforce multi-tenant isolation.

## 1. DATABASE SCHEMA & MULTI-TENANCY
We have a multi-tenant B2B SaaS architecture. 
Implement the following core tables with strict RLS policies:

1. **Users & Roles**:
   - Roles: `super_admin`, `admin` (Farm Owner), `manager`, `technician`.
   - Admin creates a `Tenant`. Managers and Technicians belong to a tenant and are assigned to specific `Warehouses`.
   - Fields: `auth.uid()`, `name`, `role`, `tenant_id`, `warehouse_id`, `phone`, `status`.

2. **Core Entities**:
   - `Tenants`: `id`, `name`, `email`, `stripe_customer_id`, `subscription_status`.
   - `Warehouses`: `id`, `tenant_id`, `manager_id`, `name`, `location`.
   - `Silos`: `id`, `warehouse_id`, `name`, `capacity`, `current_conditions` (JSONB).
   - `GrainBatches`: `id`, `silo_id`, `grain_type`, `quantity`, `moisture_content`, `harvest_date`.

3. **IoT & Telemetry**:
   - `SensorDevices`: `id`, `silo_id`, `device_type` (sensor/actuator), `status`, `mac_address`.
   - `SensorReadings` (High volume/Time-series): `id`, `device_id`, `timestamp`, `temperature`, `humidity`, `voc` (ppb), `moisture`, `derived_metrics` (JSONB), `ml_risk_score`.

4. **Business Operations**:
   - `Subscriptions`, `Payments`, `Alerts`, `Advisories`, `Buyers`, `Orders`.

**RLS Requirements**: 
Ensure RLS is enabled on all tables. An `admin` can only read/write data for their `tenant_id`. A `manager` or `technician` can only access data tied to their assigned `warehouse_id`.

## 2. AUTHENTICATION & ONBOARDING
- Map Supabase Auth hooks or use database triggers to automatically create a profile in the `Users` table when a new user signs up.
- Payment-first flow: Users pay via Stripe. If successful, an Edge Function creates their `Tenant` record, and when they sign up, they are automatically linked to their paid `tenant_id` with an `admin` role.
- Admins invite Managers/Technicians via email (use Supabase invite functionality or a custom token table).

## 3. IoT INTEGRATION (Replacing Firebase)
Currently, ESP32 devices send telemetry every 5 minutes and listen for actuator control.
- **Ingestion**: Design a Supabase Edge Function (`iot-ingest`) to receive POST requests from ESP32 devices. The function will insert into `SensorReadings`.
- **Real-time Frontend**: The Next.js frontend will use `supabase.channel()` to subscribe to `SensorReadings` inserts for real-time dashboard updates (no more Firebase).
- **Actuator Control (Fan/Lid/LEDs)**: The frontend updates a `SensorDevices.target_state` JSONB column. The ESP32 devices will pull this state via a Supabase Edge Function (or the Edge Function can trigger a lightweight MQTT webhook).

## 4. AI & ML SPOILAGE PREDICTION
GrainHero uses an XGBoost model (`smartbin_predict.py`) to predict rice/grain spoilage based on: `Temperature`, `Humidity`, `Storage_Days`, `Airflow`, `Dew_Point`, `Pest_Presence`, `Grain_Moisture`, `Rainfall`, and `VOC_relative`.
- **Your Task**: Design a Supabase Edge Function (`predict-spoilage`). This function will:
  1. Trigger on a schedule via pg_cron or Supabase simple scheduler.
  2. Aggregate the last 24h & 5min of sensor data for a silo.
  3. Calculate derived metrics (Dew point via Magnus formula, VOC baseline).
  4. Make an external HTTP call to a hosted Python ML API (I will host the Python code separately, you just write the integration logic).
  5. Store the result in a `SpoilagePredictions` table.
  6. If risk > 70%, insert a record into `Alerts` and `Advisories` tables.

## 5. STRIPE SUBSCRIPTION WEBHOOKS
Implement a Supabase Edge Function (`stripe-webhook`) to handle:
- `checkout.session.completed`: Provision a new `Tenant`, map the `stripe_customer_id`, set plan limits (Starter/Professional/Enterprise).
- `invoice.payment_succeeded`: Update `Subscription.next_payment_date`.
- `customer.subscription.updated`: Handle upgrades/downgrades limits logic.

## 6. EXTERNAL APIS & JOBS
- **Weather Service**: Create an Edge Function (`fetch-weather`) running on a CRON job to fetch OpenWeather API data (temperature, humidity, precipitation) for the farm's coordinates and save it to the database for the ML context.
- **Reporting**: Edge function to generate PDF/CSV reports using a library like `jspdf` or `csv-stringify` and upload them to Supabase Storage, returning a signed URL.

## DELIVERABLES I NEED FROM YOU
1. **Complete standard SQL schema** (DDL) using PostgreSQL with RLS policies, indexes, and triggers.
2. **Typescript Code for Supabase Edge Functions**: 
   - `iot-ingest`
   - `stripe-webhook`
   - `predict-spoilage`
3. **Frontend Implementation Guide**: A clean set of Supabase JS client functions showing how my Next.js client should authenticate, listen to real-time IoT data streams, and fetch the AI dashboard stats.

Please structure the code cleanly, use TypeScript, and ensure the IoT and ML workflows are robustly designed.
