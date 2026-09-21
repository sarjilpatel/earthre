# App Architecture

## What runs where

**1. React app (frontend)**
Yet to build

**2. API Gateway – `earthre-assignment-API`**
A single gateway for all the backend requests. Redirects request to the correct lambda depending upon the route.

| Route | Method | Redirects to |
|---|---|---|
| `/upload` | POST | `earthre-assignment-upload-lambda` |
| `/stats` | GET | `earthre-assignment-read-lambda` |
| `/logs` | GET | `earthre-assignment-read-lambda` |

**3. `earthre-assignment-upload-lambda`**
Gets the CSV file. Cleans it by:
- Converting 3 different timestamp formats into 1 format
- Converting latency into one unit (milliseconds)
- Removing entries that lack vital information
- Ignoring duplicate entries.
Writes the cleaned entries into the database.

**4. `earthre-assignment-read-lambda`**
Solves two queries for the dashboard:
- `/stats` → uptime %, number of failures, avg latency (total and service-wise)
- `/logs` → logs of checks, filtered by date/date range

**5. Database — Supabase (Postgres)**
Stores each clean check in one row of the `checks` table. Both the Lambdas access it directly.

## Why these choices

- **API Gateway + Lambda**: The assignment demands that there be an actual deployment of a stateless cloud function; this is the AWS equivalent of it.
- **Single API with two Lambdas**: One function to upload; another to fetch. Keeping them distinct keeps things simple when explaining them individually.
- **Postgres using Supabase**: No cost involved, hosted and accessible via simple SQL queries; no server to worry about.
- **A `UNIQUE` constraint on the table** (service + time + agent) takes care of duplication checking without any effort from the code inside the Lambda.

## Live setup

- Custom domain: `earthre-api.sarjilpatel.com`
- Backend region: `ap-south-1`