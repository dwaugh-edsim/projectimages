# Sim Capsule Schema Specification (v1.0 Standard)

To ensure that missions (.blob files) created today remain playable in future versions of the Command Center, we are standardizing the core JSON schema.

## Core Structure
```json
{
  "metadata": {
    "id": "STRING (e.g. CUBA62)",
    "title": "STRING (The big cinematic title)",
    "description": "STRING",
    "author": "STRING",
    "version": "STRING (e.g. 1.0)",
    "learningOutcomes": ["ARRAY OF STRINGS"]
  },
  "theme": {
    "layout": "classic | compact | immersive (default: compact)",
    "accent": "HEX CODE",
    "fontH": "STRING (Header Font)",
    "fontP": "STRING (Body Font)",
    "splashHeroURL": "URL"
  },
  "intelligenceGlossary": [
    { "term": "STRING", "definition": "STRING" }
  ],
  "reflections": {
    "pre": ["ARRAY OF STRINGS"],
    "pre_narrative": "MARKDOWN STRING",
    "post": ["ARRAY OF STRINGS"],
    "post_narrative": "MARKDOWN STRING"
  },
  "slides": [
    {
      "id": "slide_X",
      "shortTitle": "STRING (Sidebar label)",
      "longTitle": "STRING (Header label)",
      "interactionPrompt": "STRING",
      "options": ["STRING ARRAY"],
      "historicalOutcome": "MARKDOWN (Optional: Text revealed after decision)",
      "tabs": {
        "primary": { "body": "MARKDOWN", "image": "URL", "mediaURL": "URL", "mediaType": "image|pdf|video|audio", "credit": "STRING" },
        "legal": { "body": "MARKDOWN", "image": "URL", "mediaURL": "URL", "mediaType": "image|pdf|video|audio", "credit": "STRING" },
        "intel": { "body": "MARKDOWN", "image": "URL", "mediaURL": "URL", "mediaType": "image|pdf|video|audio", "credit": "STRING" }
      }
    }
  ],
  "epilogue": {
    "whatIf": [
      { "scenario": "STRING (The historical pivot point)", "outcome": "MARKDOWN (The counterfactual result)" }
    ],
    "staticDebrief": "MARKDOWN STRING (Fallback questions for offline/failsafe mode)"
  }
}
```

## Mandatory Mapping (v60.0 Hardening)
The simulation engine (Template B) MUST implement a persistent **Normalizer** to handle legacy keys:
- `exhibits` → `slides`
- `meta` → `metadata`
- `primaryColor` → `theme.accent`
- `tabs` (Array) → `tabs` (Object: primary/legal/intel)
- `title` → `shortTitle`

## Versioning Policy
- **Minor Changes**: New optional keys can be added to the schema without bumping the major version.
- **Major Changes**: Breaking changes to core keys (e.g., renaming `slides`) will require a version bump to `v2.0` and a corresponding update to the engine's Normalizer.
