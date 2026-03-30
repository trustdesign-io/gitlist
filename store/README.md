# App Store Metadata

This directory contains metadata templates for App Store and Google Play submissions.

## Structure

```
store/
├── ios/
│   └── metadata.json     # App Store Connect metadata
├── android/
│   └── metadata.json     # Google Play metadata
└── README.md
```

## Screenshots spec

### iOS (required sizes)
| Device | Size |
|--------|------|
| iPhone 6.7" (required) | 1290 × 2796 px |
| iPhone 6.5" (required) | 1242 × 2688 px |
| iPad Pro 12.9" | 2048 × 2732 px |

### Android (required sizes)
| Device | Size |
|--------|------|
| Phone (required) | min 320 px, max 3840 px, 16:9 ratio |
| 7" Tablet | 1024 × 600 px minimum |
| 10" Tablet | 1280 × 800 px minimum |

## Before submitting

1. Replace all placeholder text in `metadata.json` files
2. Add real screenshots to `screenshots/ios/` and `screenshots/android/`
3. Confirm privacy policy and support URLs are live
4. Set your Apple ID, ASC App ID, Apple Team ID, and category

## Submission commands

```bash
# iOS (App Store)
eas submit --platform ios --profile production

# Android (Google Play)
eas submit --platform android --profile production
```

See `docs/SETUP.md` for credential setup instructions.
