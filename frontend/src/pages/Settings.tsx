import { useTheme } from '../components/ThemeProvider';
import { useAuth } from '../components/AuthProvider';
import { Moon, Sun, Monitor, LogOut } from 'lucide-react';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col h-full bg-background p-4 md:p-8 max-w-3xl mx-auto w-full">
      <h2 className="text-2xl font-semibold mb-6">Settings</h2>
      
      <div className="space-y-6">
        
        {/* Appearance Section */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-secondary/30">
            <h3 className="font-medium text-lg">Appearance</h3>
            <p className="text-sm text-muted-foreground">Customize the look and feel of the app.</p>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              
              <button 
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background hover:bg-secondary text-muted-foreground'}`}
              >
                <Sun size={28} className="mb-3" />
                <span className="text-sm font-medium">Light</span>
              </button>

              <button 
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background hover:bg-secondary text-muted-foreground'}`}
              >
                <Moon size={28} className="mb-3" />
                <span className="text-sm font-medium">Dark</span>
              </button>

              <button 
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background hover:bg-secondary text-muted-foreground'}`}
              >
                <Monitor size={28} className="mb-3" />
                <span className="text-sm font-medium">System</span>
              </button>
              
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-secondary/30 flex justify-between items-center">
            <div>
              <h3 className="font-medium text-lg">Account</h3>
              <p className="text-sm text-muted-foreground">Manage your account and data synchronization.</p>
            </div>
          </div>
          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between">
            <div className="mb-4 md:mb-0">
              <p className="text-sm font-medium text-foreground">Signed in as:</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            
            <button 
              onClick={signOut}
              className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
