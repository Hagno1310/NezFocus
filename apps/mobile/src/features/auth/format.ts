// C-02 › Ngắt dòng: a long email wraps only after "@" or "." (zero-width spaces there),
// never inside a word, so the reader can spot a typo.
export const breakableEmail = (email: string) =>
  email.replace(/([@.])/g, '$1\u200B');
