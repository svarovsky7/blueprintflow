import { Button } from 'antd'
import type { ButtonProps } from 'antd'

interface ProtectedButtonProps extends ButtonProps {
  requirePermission?: boolean
}

export function ProtectedButton({ requirePermission = true, ...buttonProps }: ProtectedButtonProps) {
  if (!requirePermission) {
    return null
  }

  return <Button {...buttonProps} />
}
