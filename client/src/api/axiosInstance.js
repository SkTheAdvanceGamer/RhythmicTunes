import axios from 'axios'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('rhythmictunes_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default axiosInstance
