import { Modal } from 'antd';
import { useState } from 'react';

interface FilePreviewProps {
  url: string;
  name: string;
}

export default function FilePreview({ url, name }: FilePreviewProps) {
  const [open, setOpen] = useState(false);
  const ext = name.split('.').pop()?.toLowerCase();
  const iframeTypes = ['pdf', 'xls', 'xlsx', 'doc', 'docx'];

  return (
    <>
      <a onClick={() => setOpen(true)}>{name}</a>
      <Modal open={open} onCancel={() => setOpen(false)} footer={null} width="80%" style={{ top: 20 }}>
        {ext && iframeTypes.includes(ext) ? (
          <iframe src={url} style={{ width: '100%', height: '80vh' }} />
        ) : (
          <a href={url} target="_blank" rel="noreferrer">Скачать файл</a>
        )}
      </Modal>
    </>
  );
}
