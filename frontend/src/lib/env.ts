const backendUrl = import.meta.env.VITE_BACKEND_URL

if (!backendUrl) {
  throw new Error('VITE_BACKEND_URL is missing. Set it in frontend/.env.')
}

export const env = {
  backendUrl,
}