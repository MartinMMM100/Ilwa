# ILWA incident data schema

This document describes the current MongoDB document stored in the `incidents` collection. It matches the TypeScript model and Zod extraction schema in `server/incidents/`.

The machine-readable MongoDB schema is available in [`incident.mongo.schema.json`](incident.mongo.schema.json). It is documentation for integrations and future collection validation; the API currently performs validation before writing.

## Collection

```text
Database:   value of MONGODB_DB (normally ilwa)
Collection: incidents
```

One document represents one submitted incident. The original paragraph and reporter identity are private. Public-facing features must use a sanitized projection or derived aggregate rather than returning the complete document.

## Example document

```javascript
{
  _id: ObjectId("..."),
  submissionId: "incident-mg31j7-a8d29f",
  reportReference: "ILWA-35A8C42E1F92",
  reporterId: "development-only-resident",
  isDemoData: false,

  originalDescription:
    "Two guys robbed me near Park Station last night around 9. They took my phone and one had a knife.",

  reportedAt: ISODate("2026-09-29T18:25:00.000Z"),
  updatedAt: ISODate("2026-09-29T18:25:02.000Z"),

  status: "submitted",
  verificationStatus: "unverified",
  extractionStatus: "completed",
  extractionMethod: "openai-responses-v1",
  extractionModel: "gpt-6-luna",
  extractionFixtureMatched: null,

  extractedDetails: {
    category: "robbery",
    locationText: "near Park Station",
    timeText: "last night around 9",
    itemsTaken: ["phone"],
    offenderCount: 2,
    weaponReported: "knife",
    injuriesReported: null,
    isOngoing: null
  }
}
```

The example values are fictional. `locationText` and `timeText` are extracted phrases, not verified coordinates or normalized dates.

## Top-level fields

| Field | BSON type | Source | Meaning |
| --- | --- | --- | --- |
| `_id` | ObjectId | MongoDB | Internal primary key. Do not expose it as the user-facing reference. |
| `submissionId` | string | App | Idempotency key. Retrying the same submission must not create another document. |
| `reportReference` | string | Server | Reference displayed after successful storage. |
| `reporterId` | string | Server authentication | Private reporter identity. Never accept it from the request body. |
| `isDemoData` | boolean, optional for legacy records | Server/seeder | `true` for fictional seed records. Normal submissions are saved as `false`. |
| `originalDescription` | string | App | Original 10–5,000 character paragraph, stored unchanged. Private. |
| `reportedAt` | Date | Server | Time the original report was first stored. |
| `updatedAt` | Date | Server | Time of the latest extraction-workflow update. |
| `status` | `submitted` | Server | Submission lifecycle state. |
| `verificationStatus` | `unverified` | Server | Extraction never changes verification. |
| `extractionStatus` | `pending`, `completed`, or `failed` | Server | Structured-extraction workflow state. |
| `extractionMethod` | `mock-v1` or `openai-responses-v1` | Server | Extraction provider and workflow version. |
| `extractionModel` | string or null | Server | OpenAI model used, or null for the mock extractor. |
| `extractionFixtureMatched` | boolean or null | Server | Whether a deterministic mock fixture matched; null for real AI. |
| `extractedDetails` | object or null | Extractor | Validated structured facts. Null while pending or after failure. |

## `extractedDetails` fields

| Field | Type | Meaning |
| --- | --- | --- |
| `category` | enum | Normalized incident category. |
| `locationText` | string or null | Location phrase found in the paragraph. Not coordinates. |
| `timeText` | string or null | Time phrase found in the paragraph. Not a normalized timestamp. |
| `itemsTaken` | string array | Identified stolen items; empty when none are identified. |
| `offenderCount` | non-negative integer or null | Number explicitly described, otherwise null. |
| `weaponReported` | string or null | Explicitly reported weapon, otherwise null. |
| `injuriesReported` | string or null | Explicitly reported injury information, otherwise null. |
| `isOngoing` | boolean or null | Whether the paragraph explicitly establishes that the event is ongoing. |

Allowed categories:

```text
robbery
theft
vandalism
assault
vehicle_theft
suspicious_activity
infrastructure_fault
other_unclear
```

## Workflow

```text
POST /api/incidents
  → insert original document with extractionStatus: pending
  → call the configured extractIncident(description) implementation
  → validate the returned structure
  → update extractionStatus to completed and store extractedDetails

If extraction fails:
  → retain originalDescription
  → set extractionStatus to failed
  → keep verificationStatus as unverified
  → return the saved reportReference
```

Set `INCIDENT_EXTRACTOR=mock` for deterministic fixture extraction or
`INCIDENT_EXTRACTOR=openai` for the server-side OpenAI implementation. OpenAI mode also uses
`OPENAI_API_KEY` and `OPENAI_INCIDENT_MODEL`. It does not fall back to mock extraction when an
API call fails.

## Voice transcription boundary

`POST /api/transcriptions` accepts one completed audio recording, holds it in server memory only,
and returns an editable transcript. The route does not create an incident document and does not
store audio in MongoDB. A resident must review the returned text and separately submit the normal
incident form before `originalDescription` is saved.

## Indexes

| Index | Unique | Purpose |
| --- | --- | --- |
| `{ submissionId: 1 }` | Yes | Prevent duplicate records on retries. |
| `{ reportReference: 1 }` | Yes | Ensure every user-facing reference is unique. |

## Safe internal query examples

Exclude fictional seed records from real analytics:

```javascript
db.incidents.find({ isDemoData: { $ne: true } })
```

Count completed real reports by category:

```javascript
db.incidents.aggregate([
  {
    $match: {
      isDemoData: { $ne: true },
      extractionStatus: "completed"
    }
  },
  {
    $group: {
      _id: "$extractedDetails.category",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } }
])
```

Inspect demo-data distribution:

```javascript
db.incidents.aggregate([
  { $match: { isDemoData: true } },
  {
    $group: {
      _id: "$extractedDetails.category",
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
])
```

## Privacy and consumer rules

- Never expose `reporterId` or `originalDescription` through a public endpoint.
- Never publish exact future GPS coordinates in the live feed or map.
- Do not treat `locationText` as a verified location.
- Do not treat extraction as verification.
- Exclude `isDemoData: true` from real risk calculations, statistics, and alerts.
- Build live-feed and map responses from sanitized projections or aggregated area records.

## Planned location extension

The current schema does not yet store device location, normalized incident time, area identifiers, or risk scores. Those should be added as versioned fields after the location-confirmation and area-aggregation workflows are implemented. Until then, consumers must not infer coordinates from `locationText`.
