// Placeholder titles use the spec's screen names (docs/design/screens/); real copy lands with each screen ticket.
export const vi = {
  tabs: {
    home: 'Home',
    study: 'Học',
    tasks: 'Việc',
    inbox: 'Thông báo',
    me: 'Cá nhân',
  },
  screens: {
    welcome: 'Welcome',
    createAccount: 'Tạo tài khoản',
    enterCode: 'Nhập mã OTP',
    signIn: 'Đăng nhập',
    forgotPassword: 'Quên mật khẩu',
    updateRequired: 'Cần cập nhật app',
    completeAccount: 'Hoàn tất tài khoản',
    channel: 'Kênh',
    leftDrawer: 'Server và kênh',
    rightDrawer: 'Thành viên · Việc · Ghim',
    invite: 'Lời mời',
  },
  placeholder: {
    note: 'Màn tạm — thay bằng màn thật ở ticket sau',
    openLeft: 'Mở drawer trái',
    openRight: 'Mở drawer phải',
    fakeSignIn: 'Giả lập đã đăng nhập',
    fakeIncomplete: 'Giả lập chưa hoàn tất',
    signOut: 'Đăng xuất',
    switchLanguage: 'English',
  },
};

export type Strings = typeof vi;
