import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './auth';
import { Database } from '@/integrations/supabase/types';

type Organization = Database['public']['Tables']['organizations']['Row'];
type Membership = Database['public']['Tables']['memberships']['Row'];

interface OrganizationContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  currentMembership: Membership | null;
  loading: boolean;
  setCurrentOrg: (org: Organization | null) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentMembership, setCurrentMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshOrganizations = async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrg(null);
      setCurrentMembership(null);
      setLoading(false);
      return;
    }

    try {
      const { data: memberships, error: membershipError } = await supabase
        .from('memberships')
        .select('*, organizations(*)')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      const orgs = memberships
        ?.map(m => m.organizations)
        .filter((org): org is Organization => org !== null) ?? [];

      setOrganizations(orgs);

      // Set first org as current if none selected
      if (orgs.length > 0 && !currentOrg) {
        setCurrentOrg(orgs[0]);
        const membership = memberships?.find(m => m.org_id === orgs[0].id);
        setCurrentMembership(membership ?? null);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshOrganizations();
  }, [user]);

  useEffect(() => {
    if (currentOrg && user) {
      supabase
        .from('memberships')
        .select('*')
        .eq('org_id', currentOrg.id)
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          setCurrentMembership(data);
        });
    }
  }, [currentOrg, user]);

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrg,
        currentMembership,
        loading,
        setCurrentOrg,
        refreshOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
