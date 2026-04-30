/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="vi" dir="ltr">
    <Head />
    <Preview>Đặt lại mật khẩu tài khoản {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{siteName.toUpperCase()}</Text>
        <Heading style={h1}>Đặt lại mật khẩu</Heading>
        <Text style={text}>
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản {siteName} của bạn. Nhấn nút bên dưới để chọn mật khẩu mới.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Đặt lại mật khẩu
        </Button>
        <Text style={footer}>
          Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không bị thay đổi.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const brand = {
  fontSize: '18px',
  fontWeight: 'bold' as const,
  color: '#E8963A',
  margin: '0 0 24px',
  letterSpacing: '1px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#3d2a14',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#6b6352',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#E8963A',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
