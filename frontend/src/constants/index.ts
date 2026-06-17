export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// During development: set EXPO_PUBLIC_API_URL in your .env file to your machine's local IP
// e.g. EXPO_PUBLIC_API_URL=http://192.168.1.5:3001/api
//
// Once deployed: update .env to point to your production backend
// e.g. EXPO_PUBLIC_API_URL=https://decompose-api.railway.app/api