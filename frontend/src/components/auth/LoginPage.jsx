import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, User, MessageSquare, Download } from 'lucide-react';
import { uploadFile } from '@/utils/api';
import { API_BASE_URL } from '@/config';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';

export function LoginPage({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      toast.success('App installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegister) {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('email', email);
      if (avatar) {
        formData.append('avatar', avatar);
      }

      const { data } = await uploadFile('/auth/register', formData, null, {
        successMessage: 'Account created! Please login.',
        errorMessage: 'Registration failed'
      });

      if (data) {
        setIsRegister(false);
        setEmail('');
        setAvatar(null);
        setAvatarPreview(null);
      }
    } else {
      try {
        const response = await axios.post(API_BASE_URL + '/api/auth/login', { username, password });
        onLogin(response.data.token, response.data.userId);
      } catch (error) {
        toast.error('Login failed: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-400/20 via-background to-background">
      <div className="absolute inset-0 bg-grid-slate-200/20 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-800/20 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Card className="w-full border-border/50 shadow-2xl backdrop-blur-xl bg-card/80">
          <CardHeader className="space-y-2 text-center pb-8">
            <motion.div
              className="mb-6 flex justify-center"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <div className="p-4 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <MessageSquare className="h-10 w-10 text-primary" />
              </div>
            </motion.div>
            <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {isRegister ? 'Enter your details to get started' : 'Enter your credentials to access your account'}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {isRegister && (
                  <motion.div
                    key="avatar-section"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center space-y-3 pb-6"
                  >
                    <div className="relative group">
                      <motion.div
                        className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border shadow-sm group-hover:border-primary/50 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {avatarPreview ? (
                          <motion.img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="w-full h-full object-cover"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        ) : (
                          <User className="w-10 h-10 text-muted-foreground/50" />
                        )}
                      </motion.div>
                      <motion.label
                        htmlFor="avatar-upload"
                        className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer shadow-lg hover:bg-primary/90 transition-all hover:scale-110"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </motion.label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">Upload profile picture</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all h-11"
                  />
                </div>

                <AnimatePresence mode="wait">
                  {isRegister && (
                    <motion.div
                      key="email-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all h-11 mb-4"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all h-11"
                  />
                </div>
              </motion.div>

              <motion.div
                className="pt-4"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button type="submit" className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                  {isRegister ? 'Create Account' : 'Sign In'}
                </Button>
              </motion.div>
            </form>
            {isInstallable && (
              <motion.div
                className="pt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  onClick={handleInstall}
                  variant="outline"
                  className="w-full h-11 text-base font-medium border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download App
                </Button>
              </motion.div>
            )}
            <div className="text-center mt-8">
              <p className="text-sm text-muted-foreground">
                {isRegister ? 'Already have an account?' : "Don't have an account?"}
                <Button variant="link" onClick={() => setIsRegister(!isRegister)} className="text-primary font-semibold hover:text-primary/80 px-1.5">
                  {isRegister ? 'Sign in' : 'Sign up'}
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
