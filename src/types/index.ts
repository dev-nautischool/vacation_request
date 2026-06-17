export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string; fields?: Record<string, string> }
