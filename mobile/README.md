# Civi Groups Messenger (Expo)

An Expo-based mobile application that lets CiviCRM users authenticate with their instance and exchange group messages. After logging in with a CiviCRM site URL, API key, site key, and contact ID, users can browse the groups they belong to and chat with other members. Messages are saved to CiviCRM as `Activity` records linked to the relevant group.

## Features

- Expo-managed React Native application targeting iOS, Android, and the web
- Secure credential storage using `expo-secure-store`
- Login screen with validation and helpful prompts
- Group directory populated via the CiviCRM `GroupContact` API
- In-app chat experience backed by CiviCRM `Activity` records, including author attribution and refresh controls
- Logout shortcut directly from the group list header

## Project structure

```
mobile/
├── App.tsx
├── app.json
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── navigation/
│   ├── screens/
│   └── services/
└── README.md
```

## Getting started

1. Install dependencies (from the `mobile/` directory):

   ```bash
   cd mobile
   npm install
   ```

2. Run the Expo development server (still in the `mobile/` directory):

   ```bash
   npm start
   ```

   Use the on-screen prompts to launch the app on an Android emulator, iOS simulator, or the web.

## Connecting to CiviCRM

When logging in you will need:

- **Site URL** – the base URL of your CiviCRM installation (e.g. `https://example.org`).
- **API key** – the API key for the CiviCRM contact that will post messages.
- **Site key** – the instance/site key configured within your CiviCRM installation.
- **Contact ID** – the numeric contact ID for the authenticated user.

Once authenticated the app will:

1. Call `Contact.get` to verify your contact ID and display name.
2. Fetch group memberships with `GroupContact.get`.
3. Store credentials securely so future sessions can resume automatically.

## Messaging implementation details

- Messages are persisted via `Activity.create` calls. Each message is stored with:
  - `source_record_table = civicrm_group`
  - `source_record_id = <group id>`
  - `activity_type_id = "Text Message"`
  - `target_contact_id` populated with the IDs of every other group member.
- History is read back with `Activity.get` filtered by the same `source_record_table`, `source_record_id`, and `activity_type_id` values.
- Author names are resolved with additional `Contact.get` lookups and cached locally.

> **Note**
> Ensure that the `Text Message` activity type exists (or update the constant exported as `GROUP_MESSAGE_ACTIVITY_TYPE` in `src/services/civiClient.ts` to match your preferred activity type).

## Linting

Run ESLint to analyse the source code:

```bash
npm run lint
```

## Limitations

- This project relies on the legacy REST endpoint (`civicrm/ajax/rest`). Make sure it is enabled on your site.
- The messaging experience assumes group members are relatively small in number to avoid hitting API limits when broadcasting.
- The app does not currently support push notifications or offline caching.

