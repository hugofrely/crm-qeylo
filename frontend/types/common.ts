export interface PaginatedResponse<T> {
  count: number
  results: T[]
}

export interface ApiError {
  detail?: string
  [key: string]: unknown
}
