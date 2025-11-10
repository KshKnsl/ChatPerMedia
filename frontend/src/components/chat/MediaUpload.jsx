import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
      try {
        const response = await axios.post('http://localhost:3001/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        });
        onUpload(response.data.mediaId);
        setFile(null);
      } catch (error) {
        toast.error('Upload failed: ' + (error.response?.data?.error || error.message));
      } finally {
        setUploading(false);
      }
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
