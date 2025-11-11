import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadFile } from '@/utils/api';

export function MediaUpload({ onUpload, token }) 
{
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (file) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const { data } = await uploadFile('/upload', formData, token, {
        errorMessage: 'Upload failed'
      });
      
      if (data) {
        onUpload(data.mediaId);
        setFile(null);
      }
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="file"
        accept="video/*,image/*,audio/*"
        onChange={(e) => setFile(e.target.files[0])}
        required
        className="flex-1"
      />
      <Button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Send Media'}
      </Button>
    </form>
  );
}
