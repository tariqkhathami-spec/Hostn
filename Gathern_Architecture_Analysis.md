# Gathern.co — System Architecture Analysis

**Date:** March 27, 2026
**Method:** Frontend inspection via Chrome DevTools (network requests, response headers, JavaScript analysis)
**Target:** https://gathern.co

---

## 1. Frontend

**Framework:** Next.js (Server-Side Rendered)

**Evidence:**
- `x-powered-by: Next.js` response header on the main document
- `__NEXT_DATA__` script tag in the HTML containing SSR payload with `buildId: "UPTcSWd0xUm4M1hM6aO5I"`
- `/_next/static/chunks/` and `/_next/data/` URL patterns for JS bundles and data fetching
- `/_next/image?url=...&w=256&q=75` pattern for Next.js built-in image optimization
- Locale support: `locale: "ar"`, `defaultLocale: "ar"` — Arabic-first internationalization
- SSR data delivery: homepage content (homeData, banners, homePageSections) delivered via `__NEXT_DATA__` rather than client-side API calls

**CDN Layer:** Dual CDN — Cloudflare → AWS CloudFront

**Evidence:**
- `server: cloudflare` + `cf-ray` + `cf-cache-status: DYNAMIC` — Cloudflare is the outermost edge
- `x-cache: Hit from cloudfront` + `via: 1.1 ...cloudfront.net (CloudFront)` — AWS CloudFront sits behind Cloudflare
- `x-amz-cf-pop: MRS52-P6` — CloudFront edge location (Marseille, France POP)
- This dual-CDN setup (Cloudflare for DDoS/WAF/DNS + CloudFront for origin caching) is a deliberate architectural choice

**Hosting (inferred):** AWS (likely EC2, ECS, or Lambda) behind CloudFront — the entire AWS infrastructure chain (CloudFront, API Gateway, S3) points to an AWS-native deployment

---

## 2. Backend / API

**API Domain:** `api.gathern.co`

**Observed Endpoints:**

| Endpoint | Purpose |
|---|---|
| `/v1/web/default/config` | Global app configuration, banners, categories |
| `/v1/web/default/filter-config` | Search filter options (cities, directions, prices) |
| `/v1/web/chalet/unit?id=...&expand=gallery,chalet,extraDescription` | Unit/property detail with gallery |
| `/v1/web/chalet/calendar?id=...` | Availability calendar for a unit |
| `/v1/web/favourite-folder/list` | User's favorites |
| `/v1/web/profile` | User profile data |

**API Architecture Evidence:**
- `server: cloudflare` — API is behind Cloudflare (for DDoS/WAF protection)
- **No CloudFront** on the API (no `x-cache`, `via`, or `x-amz-cf-pop` headers) — unlike the frontend, the API goes Cloudflare → origin directly
- `cf-cache-status: DYNAMIC` — API responses are not cached at the Cloudflare edge (correct for dynamic data)
- `server-timing: cfExtPri` — Cloudflare priority hints enabled
- Security headers present: `x-content-type-options`, `x-xss-protection`

**Backend Framework (inferred):** Likely **Laravel (PHP)** or similar REST framework

**Reasoning:**
- Versioned REST API pattern: `/v1/web/...` — clean resource-based routing
- Response structure uses `{ data: {...}, SEO: {...} }` wrapper pattern common in Laravel API Resources
- `_links: []` array in nested objects resembles HATEOAS-style link embedding (common in Laravel/Fractal)
- `expand=gallery,chalet,extraDescription` query parameter for eager-loading relations — typical of Eloquent/Laravel API design
- Integer sequential IDs (`id: 93242`, `chalet_id: 61136`) — auto-increment primary keys from a relational database
- `status: true` boolean wrapper in config responses — common Laravel API pattern

**Hosting (inferred):** AWS — the entire stack is AWS-based. The API likely runs on EC2, ECS/Fargate, or Elastic Beanstalk behind Cloudflare

---

## 3. Database

**Type (inferred):** Relational SQL database — likely **MySQL** or **PostgreSQL**

**Evidence:**
- Sequential integer primary keys: `id: 93242`, `chalet_id: 61136`, gallery item `id: 49197` — characteristic of SQL auto-increment
- Relational structure: units belong to chalets (`chalet_id` foreign key), galleries belong to units
- `expand=gallery,chalet,extraDescription` — eager-loading of relations mirrors ORM (Eloquent) relationship patterns
- Cities have integer IDs (`id: 3` for Riyadh) with nested directional data — normalized relational schema
- Price fields with separate `_format` variants (`normal_price` + `normal_price_format`) — computed/formatted at the application layer, raw values stored in DB
- No MongoDB-style ObjectIDs (24-char hex strings) or UUID patterns observed anywhere

**Most Likely:** MySQL on **AWS RDS** — this is the most common stack for Laravel deployments on AWS, and aligns with the integer ID patterns and the overall AWS-native architecture

---

## 4. Storage (Images & Media) — CRITICAL FINDINGS

Gathern uses **two distinct storage domains** with different architectures:

### 4a. `cdn.gathern.co` — Static Assets & Raw Media Storage

**Architecture:** Cloudflare → **AWS S3 (direct)**

**Evidence:**
- `x-amz-request-id: YDMQZAHRCDJ1CQG6` — **AWS S3** request ID (definitive proof)
- `x-amz-id-2: uNQ9TQ8AsHgVs5SzUm4sTOU7vs7pgFzKBbIDLDCGHXfiqHyslKKVHqOGff6x3JLXlEWgg6orw=` — S3 extended request ID
- `x-amz-version-id` present — **S3 versioning is enabled** on this bucket
- `server: cloudflare` — Cloudflare sits in front as CDN/WAF
- **No CloudFront** (no `x-cache` or `via` headers) — goes directly Cloudflare → S3
- ETag format: `"538146d1e40c599ac47bfb321e790932"` — MD5 hash, standard S3 ETag

**Content served:**
- Static web assets: SVG icons (`/web/newBranding/Facebook.svg`, `/web/newBranding/ratings.svg`)
- Raw uploaded media: property images, video files (`/1/filename.jpg`, `/1/filename.mp4`)
- Video thumbnails generated as JPG alongside MP4 files

### 4b. `img.gathern.co` — Dynamic Image Resizing Service

**Architecture:** Cloudflare → CloudFront → **AWS API Gateway + Lambda** (image processor) → S3

**Evidence:**
- `x-amz-apigw-id: X0PotGQYDoEESsg=` — **AWS API Gateway** request ID (definitive proof of serverless image processing)
- `x-amzn-requestid: 144828a9-61f7-4e72-b727-55600fa8711d` — AWS Lambda/API Gateway execution ID
- `x-amzn-trace-id: Root=1-6977f96a-...` — **AWS X-Ray** distributed tracing enabled
- `x-cache: Hit from cloudfront` + `via: 1.1 ...cloudfront.net` — CloudFront caching layer
- `x-amz-cf-pop: MRS52-P2` — CloudFront edge location
- `server: cloudflare` — Cloudflare outermost layer
- `cache-control: public, max-age=31536000` — 1-year cache (aggressive caching for resized images)
- `age: 3778404` — image has been cached for ~43 days, confirming effective caching

**URL Pattern:** `https://img.gathern.co/{width}x{height}/{quality_or_bucket}/{filename}`

**Examples:**
- `/1400x0/1/filename.jpg` — full-width, auto-height
- `/600x500/1/filename.jpg` — thumbnail for listing cards
- `/150x150/1/filename.jpg` — small thumbnail/avatar

**How it works:** When a request hits `img.gathern.co/600x500/1/image.jpg`:
1. Cloudflare checks its cache → if HIT, returns immediately
2. If MISS, passes to CloudFront → if HIT, returns cached resized image
3. If MISS, CloudFront forwards to API Gateway → triggers Lambda function
4. Lambda fetches the original from S3 (`cdn.gathern.co` bucket), resizes to 600x500, returns the result
5. CloudFront + Cloudflare both cache the result for up to 1 year

---

## 5. Third-Party Services

| Service | Domain/ID | Purpose |
|---|---|---|
| Datadog RUM | `browser-intake-datadoghq.eu` (EU region) | Real User Monitoring / APM |
| Google Analytics | `G-NYWNZGE5K3`, `G-791T51F6F7` | Web analytics (two properties) |
| Google Ads | `AW-715604267` | Conversion tracking |
| Google Tag Manager | `GTM-M6T6PXZ` | Tag management |
| Amplitude | `api2.amplitude.com` | Product analytics |
| Snapchat Pixel | `f2215d36-822e-4147-a71c-ec2628fda84e` | Ad attribution |
| TikTok Pixel | `D4QN4DBC77U2Q0JDLAC0` | Ad attribution |
| Twitter/X Pixel | `tw-odm01-qvktr` | Ad attribution |
| Reddit Pixel | `a2_i06metm9vacc` | Ad attribution |
| Microsoft Clarity | `uf6m1vag8g` | Session recording / heatmaps |
| Firebase | Project: `abstract-sunset-227314` | Push notifications / mobile analytics |
| Kochava | — | Mobile attribution |
| Apple Pay SDK | `applepay.cdn-apple.com` | Payment integration |

---

## 6. Architecture Summary Diagram

```
                         ┌─────────────┐
                         │  Cloudflare  │  (DNS, WAF, DDoS, Edge Cache)
                         └──────┬───────┘
                    ┌───────────┼───────────┐
                    │           │           │
              ┌─────▼─────┐ ┌──▼──┐  ┌─────▼──────┐
              │ CloudFront │ │     │  │ CloudFront  │
              │ (Frontend) │ │     │  │  (Images)   │
              └─────┬──────┘ │     │  └──────┬──────┘
                    │        │     │         │
              ┌─────▼──────┐ │     │  ┌──────▼───────┐
              │  Next.js   │ │     │  │ API Gateway  │
              │  SSR App   │ │     │  │  + Lambda    │
              │  (AWS)     │ │     │  │ (img resize) │
              └────────────┘ │     │  └──────┬───────┘
                             │     │         │
                        ┌────▼──┐  │   ┌─────▼─────┐
                        │  API  │  │   │  AWS S3    │
                        │Server │  │   │ (storage)  │
                        │(AWS)  │  │   └───────────┘
                        └───┬───┘  │
                            │      │
                       ┌────▼────┐ │
                       │ MySQL/  │ │
                       │ RDS     │ │
                       └─────────┘ │
                                   │
                              ┌────▼─────┐
                              │  AWS S3  │
                              │(cdn.     │
                              │gathern)  │
                              └──────────┘

  gathern.co        → Cloudflare → CloudFront → Next.js (SSR on AWS)
  api.gathern.co    → Cloudflare → API Server (AWS, no CloudFront)
  img.gathern.co    → Cloudflare → CloudFront → API Gateway + Lambda → S3
  cdn.gathern.co    → Cloudflare → S3 (direct)
```

---

## 7. Key Architectural Insights

**AWS-Native Stack:** The entire infrastructure runs on AWS — S3, CloudFront, API Gateway, Lambda, and likely EC2/ECS for the API server and Next.js SSR. This is a mature, well-architected cloud deployment.

**Dual CDN Strategy:** Using Cloudflare in front of AWS CloudFront is intentional — Cloudflare handles DNS, DDoS protection, and WAF, while CloudFront provides origin-shield caching closer to the AWS origin. This is a common pattern for high-traffic Middle Eastern platforms.

**Serverless Image Processing:** The `img.gathern.co` service is a classic AWS serverless image resizing pipeline (API Gateway + Lambda + S3). Original images are stored once in S3, and resized variants are generated on-demand then aggressively cached (1-year TTL). This is cost-efficient and scales automatically.

**SSR-First Architecture:** The homepage delivers all content via server-side rendering (`__NEXT_DATA__`), which is good for SEO (critical for an Arabic marketplace). Client-side API calls only happen on interactive pages (property detail, search, user actions).

**Storage Separation:** Static assets (icons, branding) and raw uploads go directly to S3 via `cdn.gathern.co`, while user-facing property images are served through the resizing pipeline at `img.gathern.co`. This cleanly separates concerns and optimizes delivery.
