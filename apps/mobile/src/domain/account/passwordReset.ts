import { createStore } from 'zustand/vanilla';

// 10 S-MOD-03 "Quên mật khẩu?": the code mode of Đổi mật khẩu saved a new password at `at`;
// the sheet that sent the user there opens again at `password-reset-done`.
export const passwordResetStore = createStore<{ at: number }>(() => ({
  at: 0,
}));

export const passwordWasReset = () =>
  passwordResetStore.setState({ at: Date.now() });
