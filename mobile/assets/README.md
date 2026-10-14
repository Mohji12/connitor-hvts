# App icons & splash

Source: `frontend/public/images/conninter-logo.png`

Regenerate native launcher icons and splash screens:

```bash
cd mobile
npm run assets
npx cap sync
```

Then rebuild the Android/iOS app in Android Studio or Xcode.
