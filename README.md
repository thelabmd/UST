# UST Protocol

**UST** is a domain-issued, time-framed state publication protocol for machine agents.

> UST lets any domain publish:
> "Here is my current state for this specific time frame."

UST is not a central registry, not a blockchain, and not a new clock.
It is a minimal JSON-based convention for publishing verifiable state snapshots on the web.

---

## Why UST exists

The web was built around pages.
Machine agents, LLMs, crawlers, automation systems, and future AI clients need something different:

- current state
- validity window
- source domain
- deterministic integrity check
- predictable machine-readable structure
- easy cacheability
- low parsing cost

UST provides a small standard endpoint:

```
GET /ust
```

A domain can expose its current state there.

---

## Core idea

A UST document answers five questions:

| Question | Field |
|---|---|
| When? | `ust_id` |
| Who? | `domain_shard` |
| What? | `state` |
| How valid? | `valid_from` / `valid_to` |
| Untouched? | `hash` |

**Example:**

```json
{
  "protocol": "UST",
  "version": "0.1",
  "ust_id": "ust:20260424.15",
  "domain_shard": "helioradar.com",
  "generated_at": "2026-04-24T15:03:12Z",
  "valid_from": "2026-04-24T15:00:00Z",
  "valid_to": "2026-04-24T16:00:00Z",
  "state": {
    "kp": 3.0,
    "bz": -2.82,
    "solar_wind_speed": 482.9
  },
  "canonical": "ust:v0.1|domain=helioradar.com|ust_id=ust:20260424.15|bz=-2.82|kp=3.0|solar_wind_speed=482.9",
  "hash": "sha256:<hex>"
}
```

---

## Short definition

UST is a domain-issued, time-framed state publication protocol.

Or even shorter:

> **UST is RSS for state.**

RSS publishes news over time.
UST publishes state over time.

---

## What UST is not

UST is **not**:

- a central registry
- a whitelist system
- a source of absolute truth
- a guarantee that data is correct
- a replacement for UTC
- a blockchain
- a mandatory trust network
- a protocol owned by a single project

UST only defines how a domain can publish a state shard for a shared time frame.

---

## UST ID

A UST ID names a time frame.

**Basic hourly format:**

```
ust:YYYYMMDD.HH
```

**Example:**

```
ust:20260424.15
```

This means: `2026-04-24, 15:00–16:00 UTC`

**Optional finer precision:**

```
ust:20260424.15        // hour frame
ust:20260424.15:50     // minute frame
ust:20260424.15:50:30  // second frame
```

A more precise UST frame refines a broader one:

```
ust:20260424.15:50  ∈  ust:20260424.15
```

For minute or second precision, implementations SHOULD include:

```json
{
  "precision": "minute",
  "parent_ust": "ust:20260424.15"
}
```

---

## UST shard

A UST shard is a domain's state claim for a UST time frame.

**Example domains:**

```
https://helioradar.com/ust
https://muuune.com/ust
https://agrofield.io/ust
https://steelplant.ai/ust
```

Each domain publishes only its own shard.
There is no requirement that one domain lists, approves, or confirms another domain.

---

## Decentralized model

UST is **link-first**, not registry-first.

A domain may publish `/ust`. Another domain may publish its own `/ust`. A third-party agent may read both and decide whether to trust them.

**Example:**

```
helioradar.com/ust  →  space-weather state
muuune.com/ust      →  lunar / generative state
agrofield.io/ust    →  agricultural state
steelplant.ai/ust   →  industrial state
```

If they share the same `ust_id`, an agent can align them into the same time frame.

---

## Trust model

UST separates four concepts: **identity**, **integrity**, **truth**, and **trust**.

### HTTPS confirms domain identity

If an agent fetches `https://helioradar.com/ust` and the document contains `"domain_shard": "helioradar.com"`, then HTTPS binds the response to the domain.

### Hash confirms integrity

The `hash` confirms that the canonical state representation has not changed.

### Trust is client-side

UST does not globally decide whether a domain is trustworthy. Agents, applications, users, or organizations decide:

```
I trust helioradar.com for space-weather state.
I trust agrofield.io for agriculture state.
I do not trust unknown.example for industrial state.
```

### UST does not prove truth

A valid UST document does not prove that the underlying data is true.
It only proves that this domain published this structured state, for this UST frame, with this canonical hash.

---

## Required fields

A minimal UST v0.1 document **MUST** include:

| Field | Description |
|---|---|
| `protocol` | Must be `"UST"` |
| `version` | Protocol version, e.g. `"0.1"` |
| `ust_id` | Time-frame identifier |
| `domain_shard` | Domain publishing the shard |
| `generated_at` | When this shard was generated |
| `valid_from` | Start of the validity window |
| `valid_to` | End of the validity window |
| `state` | Domain-specific state payload |
| `canonical` | Deterministic canonical representation |
| `hash` | SHA-256 hash of the canonical string |

---

## Recommended optional fields

```json
{
  "precision": "hour",
  "parent_ust": null,
  "observed_at": "2026-04-24T15:02:58Z",
  "fetched_at": "2026-04-24T15:03:02Z",
  "published_at": "2026-04-24T15:03:12Z",
  "latency_ms": 14000,
  "state_schema": "https://example.com/ust.schema.json",
  "is_based_on": [
    "https://services.swpc.noaa.gov/"
  ],
  "related": [
    {
      "rel": "client",
      "href": "https://muuune.com/ust"
    }
  ]
}
```

---

## Canonical string

The canonical string is the deterministic representation used for hashing.

**Recommended format:**

```
ust:v0.1|domain={domain_shard}|ust_id={ust_id}|{key_1}={value_1}|{key_2}={value_2}
```

State keys **SHOULD** be sorted alphabetically.

**Example state:**

```json
{
  "kp": 3.0,
  "bz": -2.82,
  "solar_wind_speed": 482.9
}
```

**Canonical string:**

```
ust:v0.1|domain=helioradar.com|ust_id=ust:20260424.15|bz=-2.82|kp=3.0|solar_wind_speed=482.9
```

**Hash:**

```
hash = sha256(canonical)
```

> **Important:** Do not hash only a sum of state values.
>
> ❌ Bad — loses structure, allows different state objects to collide:
> ```
> SHA256(domain + ust_id + sum(values))
> ```
>
> ✅ Good — preserves all values and their keys:
> ```
> SHA256(canonical)
> ```

---

## Examples

### Helioradar shard

```json
{
  "protocol": "UST",
  "version": "0.1",
  "ust_id": "ust:20260424.15",
  "domain_shard": "helioradar.com",
  "generated_at": "2026-04-24T15:03:12Z",
  "valid_from": "2026-04-24T15:00:00Z",
  "valid_to": "2026-04-24T16:00:00Z",
  "state": {
    "kp": 3.0,
    "bz": -2.82,
    "solar_wind_speed": 482.9,
    "solar_wind_density": 3.66,
    "xray_flux": 0.000001
  },
  "canonical": "ust:v0.1|domain=helioradar.com|ust_id=ust:20260424.15|bz=-2.82|kp=3.0|solar_wind_density=3.66|solar_wind_speed=482.9|xray_flux=0.000001",
  "hash": "sha256:<hex>"
}
```

### Muuune shard

```json
{
  "protocol": "UST",
  "version": "0.1",
  "ust_id": "ust:20260424.15",
  "domain_shard": "muuune.com",
  "generated_at": "2026-04-24T15:03:20Z",
  "valid_from": "2026-04-24T15:00:00Z",
  "valid_to": "2026-04-24T16:00:00Z",
  "state": {
    "tithi": 8,
    "texture_mode": "WHITE_AMBIENT",
    "chord": "Am7add9",
    "noise_color": "brown"
  },
  "is_based_on": ["https://helioradar.com/ust"],
  "canonical": "ust:v0.1|domain=muuune.com|ust_id=ust:20260424.15|chord=Am7add9|noise_color=brown|texture_mode=WHITE_AMBIENT|tithi=8",
  "hash": "sha256:<hex>"
}
```

### Agriculture shard

```json
{
  "protocol": "UST",
  "version": "0.1",
  "ust_id": "ust:20260424.15",
  "domain_shard": "agrofield.io",
  "generated_at": "2026-04-24T15:04:00Z",
  "valid_from": "2026-04-24T15:00:00Z",
  "valid_to": "2026-04-24T16:00:00Z",
  "state": {
    "soil_moisture": 0.42,
    "field_temperature": 18.6,
    "crop_stage": "flowering",
    "irrigation_risk": "medium"
  },
  "canonical": "ust:v0.1|domain=agrofield.io|ust_id=ust:20260424.15|crop_stage=flowering|field_temperature=18.6|irrigation_risk=medium|soil_moisture=0.42",
  "hash": "sha256:<hex>"
}
```

### Metallurgy shard

```json
{
  "protocol": "UST",
  "version": "0.1",
  "ust_id": "ust:20260424.15",
  "domain_shard": "steelplant.ai",
  "generated_at": "2026-04-24T15:04:15Z",
  "valid_from": "2026-04-24T15:00:00Z",
  "valid_to": "2026-04-24T16:00:00Z",
  "state": {
    "furnace_temperature": 1538.4,
    "line_pressure": 2.8,
    "energy_load": 0.73,
    "production_state": "stable"
  },
  "canonical": "ust:v0.1|domain=steelplant.ai|ust_id=ust:20260424.15|energy_load=0.73|furnace_temperature=1538.4|line_pressure=2.8|production_state=stable",
  "hash": "sha256:<hex>"
}
```

---

## Verification

A client verifies a UST shard by:

1. Fetching the document over HTTPS
2. Checking that `domain_shard` matches the origin domain
3. Checking the `ust_id` format
4. Checking `valid_from` and `valid_to`
5. Recomputing `SHA256(canonical)`
6. Comparing it with `hash`
7. Applying its own trust policy for the domain

**Example pseudocode:**

```js
function verifyUST(doc, originDomain) {
  if (doc.protocol !== "UST") return false;
  if (doc.domain_shard !== originDomain) return false;

  const computed = "sha256:" + sha256(doc.canonical);
  if (computed !== doc.hash) return false;

  return true;
}
```

**Node.js hash example:**

```js
import crypto from "crypto";

function sha256(input) {
  return crypto
    .createHash("sha256")
    .update(input, "utf8")
    .digest("hex");
}

const canonical =
  "ust:v0.1|domain=helioradar.com|ust_id=ust:20260424.15|bz=-2.82|kp=3.0|solar_wind_speed=482.9";

const hash = "sha256:" + sha256(canonical);
console.log(hash);
```

---

## Cache behavior

UST endpoints SHOULD be cacheable.

**For hourly frames:**

```
Cache-Control: public, max-age=3600, stale-while-revalidate=7200
```

Better implementations MAY set `max-age` dynamically until the next UTC frame rollover.

**Example:**

```
current time: 15:45 UTC
next frame:   16:00 UTC
max-age:      900
```

---

## Discovery

### HTML

A page SHOULD expose its UST endpoint in `<head>`:

```html
<link rel="alternate" type="application/json" href="/ust">
```

Optionally:

```html
<link rel="ust" href="https://example.com/ust">
```

> `rel="ust"` is not a web standard. It is a semantic hint for agents.

### JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "DataFeed",
  "@id": "https://example.com/ust",
  "name": "Example UST Feed",
  "description": "Machine-readable UST state shard for this domain.",
  "dataFeedElement": {
    "@type": "DataFeedItem",
    "dateModified": "2026-04-24T15:03:12Z",
    "item": {
      "@type": "Dataset",
      "@id": "https://example.com/ust#ust-20260424-15",
      "identifier": "ust:20260424.15",
      "name": "UST shard ust:20260424.15"
    }
  }
}
```

### `/.well-known/ust`

Optional discovery endpoint:

```
GET /.well-known/ust
```

```json
{
  "protocol": "UST",
  "version": "0.1",
  "current": "https://example.com/ust",
  "schema": "https://example.com/ust.schema.json",
  "description": "Current UST shard for example.com"
}
```

---

## Relationship between shards

UST does not require central coordination.

A shard MAY reference another shard:

```json
{
  "is_based_on": ["https://helioradar.com/ust"]
}
```

Or with typed relationships:

```json
{
  "related": [
    { "rel": "source", "href": "https://helioradar.com/ust" },
    { "rel": "client", "href": "https://muuune.com/ust" }
  ]
}
```

These relationships are informational. Clients decide whether to follow or trust them.

---

## Verified UST receipts

UST v0.1 does not require external verification.

However, a separate verification service or laboratory may provide receipts — confirming that a given shard hash was observed or validated at a specific time.

```json
{
  "type": "USTIntegrityReceipt",
  "receipt_version": "1.0",
  "subject_url": "https://agrofield.io/ust",
  "ust_id": "ust:20260424.15",
  "domain_shard": "agrofield.io",
  "state_hash": "sha256:<hex>",
  "observed_at": "2026-04-24T15:04:12Z",
  "valid_window": {
    "from": "2026-04-24T15:00:00Z",
    "to": "2026-04-24T16:00:00Z"
  },
  "checks": {
    "https_origin": true,
    "domain_match": true,
    "ust_format": true,
    "canonical_hash": true,
    "window_alignment": true
  },
  "lab": "https://ust-lab.example",
  "lab_signature": "ed25519:<signature>"
}
```

Receipts are optional and outside the UST v0.1 core.

---

## Security model

UST v0.1 provides **integrity**, not absolute truth.

### UST can verify

- The document came from this domain
- The document has a valid canonical hash
- The state belongs to this UST frame
- The payload has not changed relative to its canonical string

### UST cannot verify by itself

- The data is true
- The publisher is honest
- The measurement was actually taken at the claimed time
- The upstream source was correct
- The domain should be trusted

Those are handled by client trust policies, domain reputation, optional receipts, signatures, or evidence-backed verification.

---

## Why UST is useful for LLM agents

LLM agents need compact, fresh, machine-readable state.

**Without UST**, an agent must:

1. open a page
2. parse HTML
3. guess freshness
4. extract values
5. infer context
6. compare sources

**With UST:**

```
GET /ust  →  verify hash  →  read state  →  check valid_to  →  decide trust  →  act
```

UST gives agents a standard way to ask:

> "What does this domain claim is true right now?"

---

## Version 0.1 scope

UST v0.1 intentionally stays small.

**Included:**

- `/ust` JSON endpoint
- `ust_id`
- `domain_shard`
- validity window
- domain-specific state
- deterministic canonical
- SHA-256 hash
- HTTPS domain binding

**Not included:**

- global registry
- whitelist
- mandatory signatures
- Merkle trees
- observer network
- timestamp authority
- blockchain
- universal schemas
- global trust decisions

---

## Implementation checklist

- [ ] Add `GET /ust`
- [ ] Return `Content-Type: application/json`
- [ ] Generate current `ust_id`
- [ ] Add `domain_shard`
- [ ] Add `generated_at`, `valid_from`, `valid_to`
- [ ] Add domain-specific `state`
- [ ] Build deterministic `canonical`
- [ ] Compute `hash = sha256(canonical)`
- [ ] Add cache headers
- [ ] Add `<link rel="alternate" type="application/json" href="/ust">` in `<head>`
- [ ] Optionally add JSON-LD `DataFeed`
- [ ] Optionally add `/.well-known/ust`
- [ ] Optionally publish a simple validator script

---

## Minimal validator response

**Valid:**

```json
{
  "valid": true,
  "checks": {
    "protocol": true,
    "domain_match": true,
    "ust_format": true,
    "hash": true,
    "validity_window": true
  }
}
```

**Invalid:**

```json
{
  "valid": false,
  "errors": [
    {
      "code": "HASH_MISMATCH",
      "message": "Computed hash does not match document hash."
    }
  ]
}
```

---

## Summary

| Concept | Meaning |
|---|---|
| `ust_id` | when |
| `domain_shard` | who says it |
| `state` | what they say |
| `canonical` | how it is written |
| `hash` | integrity check |
| HTTPS | domain binding |
| client policy | trust decision |

UST does not define global truth.

UST defines a simple, decentralized way for domains to publish machine-readable state in time.

---

## License

UST Protocol is an open specification. You may implement it freely. The specification itself is copyright © 2026 theLab.md.
