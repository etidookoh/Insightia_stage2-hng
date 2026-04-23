# Insight Engine — Intelligence Query API

A queryable demographic intelligence backend built with **NestJS**, **TypeORM**, and **PostgreSQL**. Supports advanced filtering, sorting, pagination, and a rule-based natural language query interface.

---

## Live Demo

**Base URL:** `https://stage-2-hng-beta.vercel.app/`

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: NestJS
- **ORM**: TypeORM
- **Database**: PostgreSQL
- **Validation**: class-validator + class-transformer

---

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/etidookoh/stage-2-hng
cd hng-stage-2
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=hng-stage-2
PORT=3007
```

### 3. Create the Database

```bash
psql -U postgres -c "CREATE DATABASE insighta_db;"
```

### 4. Seed the Database

Place `seed_profiles.json` in the project root (already included), then run:

```bash
npm run seed
```

The seeder is **idempotent** — re-running it will not create duplicates. It uses `INSERT ... ON CONFLICT DO NOTHING` keyed on the unique `name` column.

### 5. Start the Server

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

Server runs at `http://localhost:3007` by default.

---

## API Reference

### `GET /api/profiles`

Returns a paginated, filtered, and sorted list of profiles.

**Query Parameters:**

| Parameter                 | Type   | Description                                    |
|--------------------------|--------|------------------------------------------------|
| `gender`                 | string | `male` or `female`                             |
| `age_group`              | string | `child`, `teenager`, `adult`, `senior`         |
| `country_id`             | string | ISO 2-letter code (e.g. `NG`, `KE`)           |
| `min_age`                | number | Minimum age (inclusive)                        |
| `max_age`                | number | Maximum age (inclusive)                        |
| `min_gender_probability` | float  | Minimum gender confidence score (0–1)          |
| `min_country_probability`| float  | Minimum country confidence score (0–1)         |
| `sort_by`                | string | `age`, `created_at`, or `gender_probability`   |
| `order`                  | string | `asc` or `desc` (default: `asc`)              |
| `page`                   | number | Page number (default: `1`)                     |
| `limit`                  | number | Results per page (default: `10`, max: `50`)    |

All filters are **combinable** — results must match **all** supplied conditions.

**Example:**
```
GET /api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc&page=1&limit=10
```

**Response:**
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 142,
  "data": [ ... ]
}
```

---

### `GET /api/profiles/search`

Natural language query endpoint. Interprets plain English and converts it to filters.

**Query Parameters:**

| Parameter | Type   | Description                                    |
|-----------|--------|------------------------------------------------|
| `q`       | string | Natural language query (required)              |
| `page`    | number | Page number (default: `1`)                     |
| `limit`   | number | Results per page (default: `10`, max: `50`)    |

**Example:**
```
GET /api/profiles/search?q=young males from nigeria&page=1&limit=10
```

**Response:**
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 38,
  "data": [ ... ]
}
```

**On failure:**
```json
{ "status": "error", "message": "Unable to interpret query" }
```

---

## Natural Language Query Parser

The `/search` endpoint uses a **rule-based parser** (no AI, no LLMs). It extracts structured filters from plain English using regex patterns and lookup maps.

### Supported Patterns

| Query                                   | Extracted Filters                                 |
|----------------------------------------|---------------------------------------------------|
| `young males`                          | `gender=male`, `min_age=16`, `max_age=24`         |
| `females above 30`                     | `gender=female`, `min_age=30`                     |
| `people from angola`                   | `country_id=AO`                                   |
| `adult males from kenya`               | `gender=male`, `age_group=adult`, `country_id=KE` |
| `male and female teenagers above 17`   | `age_group=teenager`, `min_age=17`                |
| `senior women in ghana`                | `gender=female`, `age_group=senior`, `country_id=GH` |
| `children between 5 and 10`            | `age_group=child`, `min_age=5`, `max_age=10`      |

### Age Group Mappings (for parsing only)

| Keyword    | Stored `age_group` | Age Range |
|------------|--------------------|-----------|
| `young`    | *(none)*           | 16–24     |
| `child`    | `child`            | 0–12      |
| `teenager` | `teenager`         | 13–17     |
| `adult`    | `adult`            | 18–59     |
| `senior`   | `senior`           | 60+       |

> Note: `young` is a **parsing alias only** — it maps to `min_age=16, max_age=24` and is not a stored `age_group` value.

### Country Resolution

Country names and demonyms are resolved to ISO codes via a lookup table (e.g. `nigerian` → `NG`, `south africa` → `ZA`). Multi-word country names like `"ivory coast"` and `"south africa"` are supported.

### Parser Logic

1. **Gender** — detects `male/female/men/women/man/woman` keywords
2. **Country** — matches `from <country>` / `in <country>` patterns, then falls back to scanning the full input for any known country name (longest match first)
3. **Age group** — matches keywords (`young`, `teen`, `adult`, `senior`, etc.) and sets both the stored `age_group` (where applicable) and age range
4. **Explicit age constraints** — parses `above X`, `below X`, `over X`, `under X`, `aged X`, `between X and Y`
5. **Validation** — if no filter is extracted, returns `{ "status": "error", "message": "Unable to interpret query" }`

---

## Error Responses

All errors follow a consistent shape:

```json
{ "status": "error", "message": "<description>" }
```

| HTTP Code | Meaning                             |
|-----------|-------------------------------------|
| `400`     | Missing or empty required parameter |
| `422`     | Invalid parameter type              |
| `404`     | Profile not found                   |
| `500`     | Internal server error               |

---

## Database Schema

| Field                 | Type                     | Notes                                  |
|-----------------------|--------------------------|----------------------------------------|
| `id`                  | UUID (auto-generated)    | Primary key                            |
| `name`                | VARCHAR UNIQUE           | Person's full name                     |
| `gender`              | VARCHAR                  | `male` or `female`                     |
| `gender_probability`  | FLOAT                    | Confidence score                       |
| `age`                 | INT                      | Exact age                              |
| `age_group`           | VARCHAR                  | `child`, `teenager`, `adult`, `senior` |
| `country_id`          | VARCHAR(2)               | ISO code (e.g. `NG`, `KE`)            |
| `country_name`        | VARCHAR                  | Full country name                      |
| `country_probability` | FLOAT                    | Confidence score                       |
| `created_at`          | TIMESTAMP WITH TIME ZONE | Auto-generated, UTC                    |

---

## Performance Notes

- All filters use parameterised query builder conditions — no full-table scans for common filter combinations
- `name` column has a unique index (used by the idempotent seeder)
- Pagination uses `LIMIT` + `OFFSET` at the query level — only the requested page is fetched from the DB
- `getManyAndCount()` fetches data and total count in a single round-trip
- Seeder inserts in batches of 100 records for efficient bulk loading