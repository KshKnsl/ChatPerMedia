import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Info, UserSearch } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL, MICROSERVICE_URL } from '@/config';

const API_BASE = API_BASE_URL + '/api';

export function MediaViewerDialog({ open, onOpenChange, selectedMedia, provenance, loadingProvenance, onFetchProvenance, token }) {
  const [extraction, setExtraction] = useState(null);
  const [loadingExtraction, setLoadingExtraction] = useState(false);

  const handleExtract = async () => {
    if (!selectedMedia?.url) return;
    
    setLoadingExtraction(true);
    try {
      let filePath = selectedMedia.url.replace(MICROSERVICE_URL, '');
      if (filePath.startsWith('/')) {
        filePath = '.' + filePath;
      }
      
      const { data } = await axios.post(`${API_BASE}/media/extract`, 
        { file_path: filePath },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setExtraction(data);
      toast.success('Watermark extracted successfully');
    } catch (error) {
      toast.error('Failed to extract watermark: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingExtraction(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) setExtraction(null);
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 overflow-y-auto bg-black/95">
        <DialogTitle className="sr-only">Media Viewer</DialogTitle>
        <DialogDescription className="sr-only">View shared media with provenance information</DialogDescription>
        <div className="relative w-full flex flex-col">
          {selectedMedia?.mediaId && (
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button 
                onClick={handleExtract} 
                disabled={loadingExtraction} 
                size="sm" 
                variant="secondary" 
                className="bg-black/70 hover:bg-black/90 text-white border border-white/20"
              >
                {loadingExtraction ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserSearch className="h-4 w-4 mr-2" />Extract</>}
              </Button>
              <Button 
                onClick={() => onFetchProvenance(selectedMedia.mediaId)} 
                disabled={loadingProvenance} 
                size="sm" 
                variant="secondary" 
                className="bg-black/70 hover:bg-black/90 text-white border border-white/20"
              >
                {loadingProvenance ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Shield className="h-4 w-4 mr-2" />Provenance</>}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-center p-4 min-h-[50vh]">
            {selectedMedia && (
              <>
                {selectedMedia.type === 'video' ? (
                  <video src={selectedMedia.url} controls autoPlay className="max-w-full max-h-[70vh] rounded-lg" onContextMenu={(e) => e.preventDefault()} />
                ) : selectedMedia.type === 'audio' ? (
                  <div className="w-full max-w-2xl">
                    <audio src={selectedMedia.url} controls autoPlay className="w-full" onContextMenu={(e) => e.preventDefault()} />
                  </div>
                ) : (
                  <img src={selectedMedia.url} alt="Media viewer" className="max-w-full max-h-[70vh] object-contain rounded-lg" onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} />
                )}
                {selectedMedia.sender && selectedMedia.type !== 'audio' && (
                  <div className="absolute inset-0 bg-white bg-opacity-20 flex items-center justify-center pointer-events-none text-3xl md:text-5xl font-bold text-red-600">
                    {selectedMedia.sender}
                  </div>
                )}
              </>
            )}
          </div>

          {(provenance || extraction) && (
            <div className="bg-card border-t p-4">
              <div className="space-y-4 text-sm">
                {extraction && (
                  <div className="pb-4 border-b">
                    <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                      <UserSearch className="h-5 w-5" />Extracted Watermark Data
                    </h3>
                    <div className="space-y-2 bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 mt-0.5 text-blue-500" />
                        <div>
                          <div className="font-medium text-blue-600">Original Creator ID</div>
                          <div className="text-muted-foreground font-mono text-xs break-all">{extraction.original_creator || 'Not found'}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 mt-0.5 text-green-500" />
                        <div>
                          <div className="font-medium text-green-600">Leaked By Recipient ID</div>
                          <div className="text-muted-foreground font-mono text-xs break-all">{extraction.leaked_by_recipient || 'Not found'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {provenance && (
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                      <Shield className="h-5 w-5" />Media Provenance
                    </h3>
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Original Uploader</div>
                        <div className="text-muted-foreground">{provenance.creator.username} ({provenance.creator.email})</div>
                        <div className="text-xs text-muted-foreground">Uploaded: {new Date(provenance.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                    
                    {provenance.forensicEmbeds?.length > 0 && (
                      <div className="mt-3">
                        <div className="font-medium mb-2">Shared With ({provenance.forensicEmbeds.length})</div>
                        <div className="space-y-2">
                          {provenance.forensicEmbeds.map((embed, idx) => (
                            <div key={idx} className="pl-4 border-l-2 border-primary/30 text-xs">
                              <div>{embed.recipient?.username || 'Unknown'} ({embed.recipient?.email || 'N/A'})</div>
                              <div className="text-muted-foreground">{new Date(embed.createdAt).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
