import { Outlet } from 'react-router-dom'
import { Typography } from 'antd'

const Documents = () => (
  <div>
    <Typography.Title level={2}>Документы</Typography.Title>
    <Outlet />
  </div>
)

export default Documents
