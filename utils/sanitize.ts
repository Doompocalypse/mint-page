import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
  // Only run DOMPurify in browser environment
  if (typeof window === 'undefined') {
    return input; // Return unmodified input on server-side
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML allowed
    ALLOWED_ATTR: [], // No attributes allowed
  });
}; 