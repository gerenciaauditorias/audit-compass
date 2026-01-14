import { useAuth } from '@/lib/auth';
import { useOrganization } from '@/lib/organization';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, ChevronDown, LogOut, User, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { organizations, currentOrg, setCurrentOrg } = useOrganization();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleOrgChange = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) setCurrentOrg(org);
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() ?? 'U';
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-primary">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground hidden sm:block">
            ISO Audit Pro
          </span>
        </div>

        {/* Organization Selector */}
        {organizations.length > 0 && (
          <Select value={currentOrg?.id ?? ''} onValueChange={handleOrgChange}>
            <SelectTrigger className="w-auto max-w-[200px] h-9 border-0 bg-secondary/50">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Seleccionar org" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 px-2 gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                  {getInitials(user?.user_metadata?.full_name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{user?.user_metadata?.full_name ?? 'Usuario'}</span>
                <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <User className="mr-2 h-4 w-4" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
